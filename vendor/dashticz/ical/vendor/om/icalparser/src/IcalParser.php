<?php

namespace om;

/**
 * Copyright (c) 2004-2015 Roman Ožana (http://www.omdesign.cz)
 *
 * @author Roman Ožana <ozana@omdesign.cz>
 */
class IcalParser {

	/** @var \DateTimeZone */
	public $timezone;

	/** @var array */
	public $data = [];

	/** @var array */
	protected $counters = [];

	/** @var array */
	private $windowsTimezones;

	protected $arrayKeyMappings = [
		'ATTACH' => 'ATTACHMENTS',
		'EXDATE' => 'EXDATES',
		'RDATE' => 'RDATES',
	];

	public function __construct() {
		$this->windowsTimezones = require __DIR__ . '/WindowsTimezones.php'; // load Windows timezones from separate file
	}

	/**
	 * @param string $file
	 * @param null $callback
	 * @return array|null
	 * @throws \RuntimeException
	 * @throws \InvalidArgumentException
	 * @throws \Exception
	 */
	public function parseFile($file, $callback = null) {
		if (!$handle = fopen($file, 'r')) {
			throw new \RuntimeException('Can\'t open file' . $file . ' for reading');
		}
		fclose($handle);

		return $this->parseString(file_get_contents($file), $callback);
	}

	/**
	 * @param string $string
	 * @param null $callback
	 * @param boolean $add if true the parsed string is added to existing data
	 * @return array|null
	 * @throws \InvalidArgumentException
	 * @throws \Exception
	 */
	public function parseString($string, $callback = null, $add = false) {
		if ($add === false) {
			// delete old data
			$this->data = [];
			$this->counters = [];
		}

		if (!preg_match('/BEGIN:VCALENDAR/', $string)) {
			throw new \InvalidArgumentException('Invalid ICAL data format');
		}

		$section = 'VCALENDAR';

		// Replace \r\n with \n
		$string = str_replace("\r\n", "\n", $string);

		// Unfold multi-line strings
		$string = str_replace("\n ", '', $string);

		foreach (explode("\n", $string) as $row) {

			switch ($row) {
				case 'BEGIN:DAYLIGHT':
				case 'BEGIN:VALARM':
				case 'BEGIN:VTIMEZONE':
				case 'BEGIN:VFREEBUSY':
				case 'BEGIN:VJOURNAL':
				case 'BEGIN:STANDARD':
				case 'BEGIN:VTODO':
				case 'BEGIN:VEVENT':
					$section = substr($row, 6);
					$this->counters[$section] = isset($this->counters[$section]) ? $this->counters[$section] + 1 : 0;
					continue 2; // while
					break;
				case 'END:VEVENT':
					$section = substr($row, 4);
					$currCounter = $this->counters[$section];
					$event = $this->data[$section][$currCounter];
					if (!empty($event['RECURRENCE-ID'])) {
						$this->data['_RECURRENCE_IDS'][$event['RECURRENCE-ID']] = $event;
					}

					continue 2; // while
					break;
				case 'END:DAYLIGHT':
				case 'END:VALARM':
				case 'END:VTIMEZONE':
				case 'END:VFREEBUSY':
				case 'END:VJOURNAL':
				case 'END:STANDARD':
				case 'END:VTODO':
					continue 2; // while
					break;

				case 'END:VCALENDAR':
					$veventSection = 'VEVENT';
					if (!empty($this->data[$veventSection])) {
						foreach ($this->data[$veventSection] as $currCounter => $event) {
							if (!empty($event['RRULE']) || !empty($event['RDATE'])) {
								$recurrences = $this->parseRecurrences($event);
								if (!empty($recurrences)) {
									$this->data[$veventSection][$currCounter]['RECURRENCES'] = $recurrences;
								}

								if (!empty($event['UID'])) {
									$this->data["_RECURRENCE_COUNTERS_BY_UID"][$event['UID']] = $currCounter;
								}
							}
						}
					}
					continue 2; // while
					break;
			}

			list($key, $middle, $value) = $this->parseRow($row);

			if ($callback) {
				// call user function for processing line
				call_user_func($callback, $row, $key, $middle, $value, $section, $this->counters[$section]);
			} else {
				if ($section === 'VCALENDAR') {
					$this->data[$key] = $value;
				} else {
					if (isset($this->arrayKeyMappings[$key])) {
						// use an array since there can be multiple entries for this key.  This does not
						// break the current implementation--it leaves the original key alone and adds
						// a new one specifically for the array of values.
						$arrayKey = $this->arrayKeyMappings[$key];
						$this->data[$section][$this->counters[$section]][$arrayKey][] = $value;
					}

					$this->data[$section][$this->counters[$section]][$key] = $value;
				}

			}
		}

		return ($callback) ? null : $this->data;
	}

	/**
	 * @param $row
	 * @return array
	 */
	private function parseRow($row) {
		preg_match('#^([\w-]+);?([\w-]+="[^"]*"|.*?):(.*)$#i', $row, $matches);

		$key = false;
		$middle = null;
		$value = null;

		if ($matches) {
			$key = $matches[1];
			$middle = $matches[2];
			$value = $matches[3];
			$timezone = null;

			if ($key === 'X-WR-TIMEZONE' || $key === 'TZID') {
				if (preg_match('#(\w+/\w+)$#i', $value, $matches)) {
					$value = $matches[1];
				}
				$value = $this->toTimezone($value);
				$this->timezone = new \DateTimeZone($value);
			}

			// have some middle part ?
			if ($middle && preg_match_all('#(?<key>[^=;]+)=(?<value>[^;]+)#', $middle, $matches, PREG_SET_ORDER)) {
				$middle = [];
				foreach ($matches as $match) {
					if ($match['key'] === 'TZID') {
						$match['value'] = trim($match['value'], "'\"");
						$match['value'] = $this->toTimezone($match['value']);
						try {
							$middle[$match['key']] = $timezone = new \DateTimeZone($match['value']);
						} catch (\Exception $e) {
							$middle[$match['key']] = $match['value'];
						}
					} elseif ($match['key'] === 'ENCODING') {
						if ($match['value'] === 'QUOTED-PRINTABLE') {
							$value = quoted_printable_decode($value);
						}
					}
				}
			}
		}

		// process simple dates with timezone
		if (in_array($key, ['DTSTAMP', 'LAST-MODIFIED', 'CREATED', 'DTSTART', 'DTEND'], true)) {
			try {
				$value = new \DateTime($value, ($timezone ?: $this->timezone));
			} catch (\Exception $e) {
				$value = null;
			}
		} elseif (in_array($key, ['EXDATE', 'RDATE'])) {
			$values = [];
			foreach (explode(',', $value) as $singleValue) {
				try {
					$values[] = new \DateTime($singleValue, ($timezone ?: $this->timezone));
				} catch (\Exception $e) {
					// pass
				}
			}
			if (count($values) === 1) {
				$value = $values[0];
			} else {
				$value = $values;
			}
		}

		if ($key === 'RRULE' && preg_match_all('#(?<key>[^=;]+)=(?<value>[^;]+)#', $value, $matches, PREG_SET_ORDER)) {
			$middle = null;
			$value = [];
			foreach ($matches as $match) {
				if (in_array($match['key'], ['UNTIL'])) {
					try {
						$value[$match['key']] = new \DateTime($match['value'], ($timezone ?: $this->timezone));
					} catch (\Exception $e) {
						$value[$match['key']] = $match['value'];
					}
				} else {
					$value[$match['key']] = $match['value'];
				}
			}
		}

		//split by comma, escape \,
		if ($key === 'CATEGORIES') {
			$value = preg_split('/(?<![^\\\\]\\\\),/', $value);
		}

		//implement 4.3.11 Text ESCAPED-CHAR
		$text_properties = [
			'CALSCALE', 'METHOD', 'PRODID', 'VERSION', 'CATEGORIES', 'CLASS', 'COMMENT', 'DESCRIPTION',
			'LOCATION', 'RESOURCES', 'STATUS', 'SUMMARY', 'TRANSP', 'TZID', 'TZNAME', 'CONTACT',
			'RELATED-TO', 'UID', 'ACTION', 'REQUEST-STATUS', 'URL',
		];
		if (in_array($key, $text_properties) || strpos($key, 'X-') === 0) {
			if (is_array($value)) {
				foreach ($value as &$var) {
					$var = strtr($var, ['\\\\' => '\\', '\\N' => "\n", '\\n' => "\n", '\\;' => ';', '\\,' => ',']);
				}
			} else {
				$value = strtr($value, ['\\\\' => '\\', '\\N' => "\n", '\\n' => "\n", '\\;' => ';', '\\,' => ',']);
			}
		}

		return [$key, $middle, $value];
	}

	/**
	 * @param $event
	 * @return array
	 * @throws \Exception
	 */
	public function parseRecurrences($event) {
		$recurring = new Recurrence($event['RRULE']);
		$exclusions = [];
		$additions = [];

		if (!empty($event['EXDATES'])) {
			foreach ($event['EXDATES'] as $exDate) {
				if (is_array($exDate)) {
					foreach ($exDate as $singleExDate) {
						$exclusions[] = $singleExDate->getTimestamp();
					}
				} else {
					$exclusions[] = $exDate->getTimestamp();
				}
			}
		}

		if (!empty($event['RDATES'])) {
			foreach ($event['RDATES'] as $rDate) {
				if (is_array($rDate)) {
					foreach ($rDate as $singleRDate) {
						$additions[] = $singleRDate->getTimestamp();
					}
				} else {
					$additions[] = $rDate->getTimestamp();
				}
			}
		}

		$until = $recurring->getUntil();
		if ($until === false) {
			//forever... limit to 3 years
			$end = clone($event['DTSTART']);
			$end->add(new \DateInterval('P3Y')); // + 3 years
			$recurring->setUntil($end);
			$until = $recurring->getUntil();
		}

		date_default_timezone_set($event['DTSTART']->getTimezone()->getName());
		$frequency = new Freq($recurring->rrule, $event['DTSTART']->getTimestamp(), $exclusions, $additions);
		$recurrenceTimestamps = $frequency->getAllOccurrences();
		$recurrences = [];
		foreach ($recurrenceTimestamps as $recurrenceTimestamp) {
			$tmp = new \DateTime('now', $event['DTSTART']->getTimezone());
			$tmp->setTimestamp($recurrenceTimestamp);

			$recurrenceIDDate = $tmp->format('Ymd');
			$recurrenceIDDateTime = $tmp->format('Ymd\THis');
			if (empty($this->data['_RECURRENCE_IDS'][$recurrenceIDDate]) &&
				empty($this->data['_RECURRENCE_IDS'][$recurrenceIDDateTime])) {
				$gmtCheck = new \DateTime("now", new \DateTimeZone('UTC'));
				$gmtCheck->setTimestamp($recurrenceTimestamp);
				$recurrenceIDDateTimeZ = $gmtCheck->format('Ymd\THis\Z');
				if (empty($this->data['_RECURRENCE_IDS'][$recurrenceIDDateTimeZ])) {
					$recurrences[] = $tmp;
				}
			}
		}

		return $recurrences;
	}

	/**
	 * @return array
	 */
	public function getEvents() {
		$events = [];
		if (isset($this->data['VEVENT'])) {
			for ($i = 0; $i < count($this->data['VEVENT']); $i++) {
				$event = $this->data['VEVENT'][$i];

				if (empty($event['RECURRENCES'])) {
					if (!empty($event['RECURRENCE-ID']) && !empty($event['UID']) && isset($event['SEQUENCE'])) {
						$modifiedEventUID = $event['UID'];
						$modifiedEventRecurID = $event['RECURRENCE-ID'];
						$modifiedEventSeq = intval($event['SEQUENCE'], 10);

						if (isset($this->data["_RECURRENCE_COUNTERS_BY_UID"][$modifiedEventUID])) {
							$counter = $this->data["_RECURRENCE_COUNTERS_BY_UID"][$modifiedEventUID];

							$originalEvent = $this->data["VEVENT"][$counter];
							if (isset($originalEvent['SEQUENCE'])) {
								$originalEventSeq = intval($originalEvent['SEQUENCE'], 10);
								$originalEventFormattedStartDate = $originalEvent['DTSTART']->format('Ymd\THis');
								if ($modifiedEventRecurID === $originalEventFormattedStartDate && $modifiedEventSeq > $originalEventSeq) {
									// this modifies the original event
									$modifiedEvent = array_replace_recursive($originalEvent, $event);
									$this->data["VEVENT"][$counter] = $modifiedEvent;
									foreach ($events as $z => $event) {
										if ($events[$z]['UID'] === $originalEvent['UID'] &&
											$events[$z]['SEQUENCE'] === $originalEvent['SEQUENCE']) {
											// replace the original event with the modified event
											$events[$z] = $modifiedEvent;
											break;
										}
									}
									$event = null; // don't add this to the $events[] array again
								} elseif (!empty($originalEvent['RECURRENCES'])) {
									for ($j = 0; $j < count($originalEvent['RECURRENCES']); $j++) {
										$recurDate = $originalEvent['RECURRENCES'][$j];
										$formattedStartDate = $recurDate->format('Ymd\THis');
										if ($formattedStartDate === $modifiedEventRecurID) {
											unset($this->data["VEVENT"][$counter]['RECURRENCES'][$j]);
											$this->data["VEVENT"][$counter]['RECURRENCES'] = array_values($this->data["VEVENT"][$counter]['RECURRENCES']);
											break;
										}
									}
								}
							}
						}
					}

					if (!empty($event)) {
						$events[] = $event;
					}
				} else {
					$recurrences = $event['RECURRENCES'];
					$event['RECURRING'] = true;
					$event['DTEND'] = !empty($event['DTEND']) ? $event['DTEND'] : $event['DTSTART'];
					$eventInterval = $event['DTSTART']->diff($event['DTEND']);

					$firstEvent = true;
					foreach ($recurrences as $j => $recurDate) {
						$newEvent = $event;
						if (!$firstEvent) {
							unset($newEvent['RECURRENCES']);
							$newEvent['DTSTART'] = $recurDate;
							$newEvent['DTEND'] = clone($recurDate);
							$newEvent['DTEND']->add($eventInterval);
						}

						$newEvent['RECURRENCE_INSTANCE'] = $j;
						$events[] = $newEvent;
						$firstEvent = false;
					}
				}
			}
		}
		return $events;
	}

	/**
	 * Process timezone and return correct one...
	 *
	 * @param string $zone
	 * @return mixed|null
	 */
	private function toTimezone($zone) {
		return isset($this->windowsTimezones[$zone]) ? $this->windowsTimezones[$zone] : $zone;
	}

	/**
	 * @return array
	 */
	public function getAlarms() {
		return isset($this->data['VALARM']) ? $this->data['VALARM'] : [];
	}

	/**
	 * @return array
	 */
	public function getTimezones() {
		return isset($this->data['VTIMEZONE']) ? $this->data['VTIMEZONE'] : [];
	}

	/**
	 * @return array
	 */
	public function getTimezone() {
		return $this->getTimezones();
	}

	/**
	 * Return sorted event list as array
	 *
	 * @return array
	 */
	public function getSortedEvents() {
		if ($events = $this->getEvents()) {
			usort(
				$events, function ($a, $b) {
				return $a['DTSTART'] > $b['DTSTART'];
			}
			);
			return $events;
		}
		return [];
	}

	/**
	 * @return array
	 */
	public function getReverseSortedEvents() {
		if ($events = $this->getEvents()) {
			usort(
				$events, function ($a, $b) {
				return $a['DTSTART'] < $b['DTSTART'];
			}
			);
			return $events;
		}
		return [];
	}

}
