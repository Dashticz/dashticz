<?php
/**
 * Smoke-test for configwriter_pack_columns_by_height().
 * Run: php tests/pack-columns.php
 */
require_once __DIR__ . '/../js/configwriter.php';

function assert_pack($label, $items, $expected)
{
    $packed = configwriter_pack_columns_by_height($items, 12, 'le_col');
    $simplified = array_map(function ($column) {
        return [
            'blocks' => $column['blocks'],
            'width' => $column['width'],
        ];
    }, $packed);

    if ($simplified !== $expected) {
        fwrite(STDERR, "FAIL: {$label}\n");
        fwrite(STDERR, 'Expected: ' . json_encode($expected) . "\n");
        fwrite(STDERR, 'Actual:   ' . json_encode($simplified) . "\n");
        exit(1);
    }
    echo "OK: {$label}\n";
}

// Equal heights → classic width chunking into full-width columns.
assert_pack(
    'equal heights chunk by width',
    [
        ['ref' => 'A', 'width' => 4],
        ['ref' => 'B', 'width' => 4],
        ['ref' => 'C', 'width' => 4],
        ['ref' => 'D', 'width' => 6],
        ['ref' => 'E', 'width' => 6],
    ],
    [
        ['blocks' => ['A', 'B', 'C'], 'width' => 12],
        ['blocks' => ['D', 'E'], 'width' => 12],
    ]
);

// Tall right tile: side-pocket shorts join the short column (no flex gap).
assert_pack(
    'tall block creates virtual side column',
    [
        ['ref' => 'BLOK1', 'width' => 4, 'height' => 120],
        ['ref' => 'BLOK2', 'width' => 4, 'height' => 120],
        ['ref' => 'BLOK3', 'width' => 4, 'height' => 240],
        ['ref' => 'BLOK4', 'width' => 4, 'height' => 120],
        ['ref' => 'BLOK5', 'width' => 4, 'height' => 120],
    ],
    [
        ['blocks' => ['BLOK1', 'BLOK2', 'BLOK4', 'BLOK5'], 'width' => 8],
        ['blocks' => ['BLOK3'], 'width' => 4],
    ]
);

// Triple-height tall tile fills two side pockets inside the short column.
assert_pack(
    'triple height fills two side rows',
    [
        ['ref' => 'A', 'width' => 6, 'height' => 120],
        ['ref' => 'T', 'width' => 6, 'height' => 360],
        ['ref' => 'B', 'width' => 6, 'height' => 120],
        ['ref' => 'C', 'width' => 6, 'height' => 120],
    ],
    [
        ['blocks' => ['A', 'B', 'C'], 'width' => 6],
        ['blocks' => ['T'], 'width' => 6],
    ]
);

echo "All pack-column checks passed.\n";
