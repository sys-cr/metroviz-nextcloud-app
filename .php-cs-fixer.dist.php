<?php
declare(strict_types=1);

// PHP-CS-Fixer configuration for MetroViz-NC.
// Enforces PSR-12 + a small list of opinionated rules that match the
// Nextcloud-server project. To run locally:
//
//   composer require --dev friendsofphp/php-cs-fixer
//   vendor/bin/php-cs-fixer fix --dry-run --diff   # report
//   vendor/bin/php-cs-fixer fix                    # apply
//
// CI wires this via `composer fix-style` once the composer skeleton lands.

$finder = (new PhpCsFixer\Finder())
    ->in([__DIR__ . '/lib', __DIR__ . '/tests/php'])
    ->name('*.php')
    ->ignoreDotFiles(true)
    ->ignoreVCSIgnored(true);

return (new PhpCsFixer\Config())
    ->setRiskyAllowed(false)
    ->setRules([
        '@PSR12' => true,
        'array_syntax' => ['syntax' => 'short'],
        'declare_strict_types' => true,
        'no_unused_imports' => true,
        'ordered_imports' => ['sort_algorithm' => 'alpha'],
        'single_quote' => true,
        'trailing_comma_in_multiline' => ['elements' => ['arrays', 'arguments']],
        'whitespace_after_comma_in_array' => true,
    ])
    ->setFinder($finder)
    ->setIndent('    ')
    ->setLineEnding("\n");
