/**
 * Semantic Token Contrast Validation
 *
 * Validates color contrast across all theme variants (5 themes × 2 modes = 10 variants) for:
 * - **WCAG AA compliance** (text: 4.5:1, UI components: 3:1)
 * - **Minimum visibility** for decorative elements (1.3:1)
 *
 * Ensures accessible interactive elements while catching decorative tokens that become
 * too subtle to serve their visual hierarchy purpose.
 *
 * **Scope:** semantic pairs, structural surfaces, status text and translucent feedback
 *
 * **Usage:**
 * - Development: `npm run verify-contrast`
 * - CI Pipeline: `npm run verify-contrast:ci` (included in frontend quality gates)
 *
 * **Exit codes:**
 * - 0: All contrast requirements met
 * - 1: One or more contrast violations detected
 */

import {
    marqueeTheme,
    githubTheme,
    ibmCarbonTheme,
    gitlabPajamasTheme,
    materialDesign3Theme,
} from "../src/theme/color/definitions";
import {
    ALL_TOKEN_PAIRS,
    THRESHOLDS,
    validateTheme,
    type ValidationResult,
} from "../src/theme/color/contrast-checks";

// ============================================================================
// MAIN VALIDATION
// ============================================================================

function runValidation() {
    const themes = [
        { name: "Marquee", def: marqueeTheme },
        { name: "GitHub Primer", def: githubTheme },
        { name: "IBM Carbon", def: ibmCarbonTheme },
        { name: "GitLab Pajamas", def: gitlabPajamasTheme },
        { name: "Material Design 3", def: materialDesign3Theme },
    ];

    const allResults: ValidationResult[] = [];
    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    let totalSkipped = 0;
    let scopedSkipped = 0;

    console.log("=".repeat(80));
    console.log("SEMANTIC TOKEN CONTRAST VALIDATION");
    console.log("=".repeat(80));
    console.log();
    console.log(
        `Testing ${themes.length} themes × 2 modes = ${themes.length * 2} variants`,
    );
    console.log(`Token pairs per variant: ${ALL_TOKEN_PAIRS.length}`);
    console.log(`Total tests: ${themes.length * 2 * ALL_TOKEN_PAIRS.length}`);
    console.log();

    // Run validation for each theme variant
    for (const { def } of themes) {
        for (const mode of ["light", "dark"] as const) {
            const themeColors =
                mode === "light" ? def.lightUnified : def.darkUnified;

            for (const result of validateTheme(themeColors, def.name, mode)) {
                allResults.push(result);
                totalTests++;

                if (result.skipped === "theme") {
                    scopedSkipped++;
                } else if (result.skipped === "optional") {
                    totalSkipped++;
                } else if (result.passed) {
                    totalPassed++;
                } else {
                    totalFailed++;
                }
            }
        }
    }

    // ========================================================================
    // REPORT: Failures Only
    // ========================================================================

    const failures = allResults.filter(
        (r) => !r.passed && !r.reason?.includes("skipped"),
    );

    if (failures.length > 0) {
        console.log("❌ FAILURES DETECTED");
        console.log("=".repeat(80));
        console.log();

        // Group failures by theme
        const failuresByTheme = failures.reduce(
            (acc, failure) => {
                const key = `${failure.themeName} (${failure.mode})`;
                if (!acc[key]) acc[key] = [];
                acc[key].push(failure);
                return acc;
            },
            {} as Record<string, ValidationResult[]>,
        );

        for (const [themeKey, themeFailures] of Object.entries(
            failuresByTheme,
        )) {
            console.log(`\n${themeKey}:`);
            console.log("-".repeat(80));

            for (const failure of themeFailures) {
                const thresholdType = failure.pair.threshold || "text";
                const threshold = THRESHOLDS[thresholdType];
                const thresholdLabel =
                    thresholdType === "decorative"
                        ? "DECORATIVE (visibility)"
                        : thresholdType === "ui"
                          ? "UI (WCAG AA)"
                          : "TEXT (WCAG AA)";

                console.log(`  ${failure.pair.fg} on ${failure.pair.bg}`);
                if (failure.pair.backdrop)
                    console.log(
                        `    Backdrop: ${failure.pair.backdrop.join(" → ")}`,
                    );
                console.log(`    FG: ${failure.fgValue}`);
                console.log(`    BG: ${failure.bgValue}`);
                console.log(
                    `    Ratio: ${failure.ratio?.toFixed(2)} (need ${threshold}:1 for ${thresholdLabel})`,
                );

                if (failure.reason) {
                    console.log(`    Reason: ${failure.reason}`);
                }

                console.log();
            }
        }
    }

    // ========================================================================
    // SUMMARY
    // ========================================================================

    console.log();
    console.log("=".repeat(80));
    console.log("SUMMARY");
    console.log("=".repeat(80));
    console.log(`Total tests:   ${totalTests}`);
    console.log(`✅ Passed:      ${totalPassed}`);
    console.log(`❌ Failed:      ${totalFailed}`);
    console.log(`⊘  Skipped:     ${totalSkipped} (optional tokens)`);
    console.log(`⊘  Scoped out:  ${scopedSkipped} (theme scope)`);
    console.log();

    if (failures.length === 0) {
        console.log(
            "✅ ALL TESTS PASSED - All tokens meet contrast requirements!",
        );
        console.log("   (WCAG AA compliance + minimum visibility thresholds)");
        process.exit(0);
    } else {
        console.log(`❌ ${failures.length} FAILURES - See details above`);
        console.log("   (Mix of WCAG violations and visibility concerns)");
        process.exit(1);
    }
}

// Run validation
runValidation();
