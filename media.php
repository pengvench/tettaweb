<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');

$root = __DIR__;
$folders = [
    'photo' => 'img/photo',
    'icon' => 'img/icon',
    'assets' => 'img/assets',
    'graffiti' => 'img/graffiti',
];
$extensions = ['avif', 'webp', 'png', 'jpg', 'jpeg', 'gif', 'svg'];

function encode_public_path(string $path): string
{
    return implode('/', array_map('rawurlencode', explode('/', str_replace('\\', '/', $path))));
}

$result = [];

foreach ($folders as $key => $relativeDir) {
    $absoluteDir = realpath($root . DIRECTORY_SEPARATOR . $relativeDir);
    $items = [];

    if ($absoluteDir && is_dir($absoluteDir)) {
        foreach (new DirectoryIterator($absoluteDir) as $file) {
            if (!$file->isFile()) {
                continue;
            }

            $extension = strtolower($file->getExtension());
            if (!in_array($extension, $extensions, true)) {
                continue;
            }

            $items[] = encode_public_path($relativeDir . '/' . $file->getFilename());
        }
    }

    sort($items, SORT_NATURAL | SORT_FLAG_CASE);
    $result[$key] = $items;
}

echo json_encode($result, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
