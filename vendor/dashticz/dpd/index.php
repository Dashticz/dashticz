<?php
require_once(__DIR__ . '/../security.php');

require_once(__DIR__ . '/dpd.php');

// This endpoint promises JSON even when PHP itself raises a fatal error.
@ini_set('display_errors', '0');

dashticz_require_same_origin();
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

register_shutdown_function(function () {
    $error = error_get_last();
    if (!$error || !in_array($error['type'], array(E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR), true)) {
        return;
    }
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json');
    }
    echo json_encode(array(
        'error' => 'DPD request failed unexpectedly.',
        'debug' => array(
            'message' => $error['message'],
            'file' => basename($error['file']),
            'line' => $error['line'],
        ),
    ));
});

/* Backend bridge for the DPD part of the PostNL widget
 * (js/components/postnl.js). Works like vendor/dashticz/dhl/index.php: the
 * browser posts the widget's own global settings (dpd_username/dpd_password,
 * see js/widgeteditor.js) and this file logs in to the user's myDPD account
 * server-side and returns the same {incoming, sent} shape of
 * {status, who, from, to, deliveryDate} entries, so the widget can show
 * PostNL, DHL and DPD packages in one list.
 *
 * DPD has no public consumer API; this uses the same (unofficial) login chain
 * as the myDPD mobile app and the domoticz_postnl plugin
 * (https://github.com/MadPatrick/domoticz_postnl), as documented by the Home
 * Assistant integration ha-dpd. If DPD changes it, this stops working until
 * it is ported again. Only DPD Netherlands (the shared myDPD backend).
 *
 * The tokens are not cached: only the last fetched (non-secret) shipment
 * summaries, for the widget's poll interval (postnl_pollminutes, default 60,
 * minimum 15), in custom/cache/dpd/<hash>.json.
 */
try {
    if (!function_exists('curl_init')) {
        throw new RuntimeException('The PHP curl extension is required for the DPD part of the PostNL widget.');
    }
    $input = dashticz_dpd_read_input();
    $result = dashticz_dpd_get_shipments(
        $input['username'],
        $input['password'],
        $input['days'],
        $input['pollMinutes'] * 60
    );
    echo json_encode($result);
} catch (RuntimeException $error) {
    dashticz_json_error(400, $error->getMessage());
}
