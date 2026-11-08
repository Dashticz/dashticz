<?php

// Loads the shared helpers once for every test. security.php only defines
// functions, so requiring it has no side effects.
require_once dirname(__DIR__, 2) . '/vendor/dashticz/security.php';
