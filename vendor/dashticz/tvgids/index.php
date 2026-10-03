<?php
require_once(__DIR__ . '/../security.php');
require_once(__DIR__ . '/tvgids.php');

@ini_set('display_errors', '0');

dashticz_require_same_origin();
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

/* Backend bridge for the TVgids widget (js/components/tvgids.js). Reads
 * today's programme of each requested channel from tvgids24.nl
 * (https://www.tvgids24.nl/zender/<channel>/vandaag, the schema.org
 * BroadcastEvent items on that page) and caches it per channel for the poll
 * interval (custom/cache/tvgids/<channel>.json), so several connected
 * dashboards share one download. The channel ids are the ones in
 * channels.json next to this file; their logos are in img/custom/tvgids/.
 *
 * Request (JSON): {"channels": ["npo_1", "rtl_4"], "pollMinutes": 60}
 * Response: {"channels": [{"id": "npo_1", "name": "NPO 1",
 *            "programmes": [{"start": ts, "end": ts, "title": "...",
 *            "url": "https://www.tvgids24.nl/..."}]}]} (unix timestamps);
 *            a channel that could not be read has "error" instead of
 *            "programmes".
 */
try {
    $input = json_decode((string) file_get_contents('php://input'), true);
    if (!is_array($input) || !isset($input['channels']) || !is_array($input['channels'])) {
        throw new RuntimeException('Invalid TVgids request.');
    }
    $known = dashticz_tvgids_channels();
    $channels = array();
    foreach ($input['channels'] as $id) {
        if (is_string($id) && isset($known[$id]) && !in_array($id, $channels, true)) {
            $channels[] = $id;
        }
    }
    if (!$channels || count($channels) > 50) {
        throw new RuntimeException('Choose between 1 and 50 TV channels.');
    }
    $pollMinutes = isset($input['pollMinutes']) ? (int) $input['pollMinutes'] : 60;
    $ttl = max(15, min(1440, $pollMinutes)) * 60;

    $result = array();
    foreach ($channels as $id) {
        $channel = array('id' => $id, 'name' => $known[$id]);
        try {
            $channel['programmes'] = dashticz_tvgids_programmes($id, $ttl);
        } catch (RuntimeException $error) {
            $channel['error'] = $error->getMessage();
        }
        $result[] = $channel;
    }
    echo json_encode(array('channels' => $result));
} catch (RuntimeException $error) {
    dashticz_json_error(400, $error->getMessage());
}
