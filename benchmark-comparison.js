import { performance } from 'node:perf_hooks';

// Import both versions
const originalCallsites = (await import('./index.original.js')).default;
const optimizedCallsites = (await import('./index.js')).default;

// Benchmark configuration
const ITERATIONS = 100000;
const WARMUP_ITERATIONS = 10000;

// Helper function to format numbers
function formatNumber(num) {
	return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

// Helper function to format percentage
function formatPercent(original, optimized) {
	const improvement = ((original - optimized) / original) * 100;
	const sign = improvement > 0 ? '+' : '';
	return `${sign}${improvement.toFixed(1)}%`;
}

// Helper function to run a benchmark
function benchmark(fn, iterations = ITERATIONS) {
	// Warmup
	for (let i = 0; i < WARMUP_ITERATIONS; i++) {
		fn();
	}

	// Collect garbage before benchmark
	if (global.gc) {
		global.gc();
	}

	const start = performance.now();
	for (let i = 0; i < iterations; i++) {
		fn();
	}
	const end = performance.now();

	const totalTime = end - start;
	const avgTime = totalTime / iterations;
	const opsPerSec = (iterations / totalTime) * 1000;

	return { totalTime, avgTime, opsPerSec };
}

// Comparison helper
function compareScenario(name, originalFn, optimizedFn, iterations = ITERATIONS) {
	console.log(`\n${name}:`);

	const originalResult = benchmark(originalFn, iterations);
	const optimizedResult = benchmark(optimizedFn, iterations);

	console.log(`  Original:  ${formatNumber(originalResult.totalTime)} ms  (${formatNumber(originalResult.opsPerSec)} ops/sec)`);
	console.log(`  Optimized: ${formatNumber(optimizedResult.totalTime)} ms  (${formatNumber(optimizedResult.opsPerSec)} ops/sec)`);
	console.log(`  Improvement: ${formatPercent(originalResult.totalTime, optimizedResult.totalTime)}`);

	return {
		original: originalResult,
		optimized: optimizedResult,
		improvement: ((originalResult.totalTime - optimizedResult.totalTime) / originalResult.totalTime) * 100
	};
}

console.log('='.repeat(70));
console.log('Callsites Optimization - Performance Comparison');
console.log('='.repeat(70));
console.log(`Iterations: ${formatNumber(ITERATIONS)}`);
console.log(`Warmup iterations: ${formatNumber(WARMUP_ITERATIONS)}`);

// Test scenarios
console.log('\n' + '-'.repeat(70));

const results = [];

// Scenario 1: Basic call
results.push(compareScenario(
	'Scenario 1: Basic callsites() call',
	() => originalCallsites(),
	() => optimizedCallsites()
));

// Scenario 2: Access fileName
results.push(compareScenario(
	'Scenario 2: Access fileName (common use case)',
	() => {
		const sites = originalCallsites();
		const fileName = sites[0].getFileName();
	},
	() => {
		const sites = optimizedCallsites();
		const fileName = sites[0].getFileName();
	}
));

// Scenario 3: Multiple properties
results.push(compareScenario(
	'Scenario 3: Access multiple properties',
	() => {
		const sites = originalCallsites();
		const site = sites[0];
		const fileName = site.getFileName();
		const lineNumber = site.getLineNumber();
		const columnNumber = site.getColumnNumber();
	},
	() => {
		const sites = optimizedCallsites();
		const site = sites[0];
		const fileName = site.getFileName();
		const lineNumber = site.getLineNumber();
		const columnNumber = site.getColumnNumber();
	}
));

// Scenario 4: Iterate through all
results.push(compareScenario(
	'Scenario 4: Iterate through all callsites',
	() => {
		const sites = originalCallsites();
		for (const site of sites) {
			const fileName = site.getFileName();
			const lineNumber = site.getLineNumber();
		}
	},
	() => {
		const sites = optimizedCallsites();
		for (const site of sites) {
			const fileName = site.getFileName();
			const lineNumber = site.getLineNumber();
		}
	},
	ITERATIONS / 10
));

// Scenario 5: Repeated access (caching test)
results.push(compareScenario(
	'Scenario 5: Repeated property access (tests caching)',
	() => {
		const sites = originalCallsites();
		const site = sites[0];
		for (let i = 0; i < 10; i++) {
			const fileName = site.getFileName();
		}
	},
	() => {
		const sites = optimizedCallsites();
		const site = sites[0];
		for (let i = 0; i < 10; i++) {
			const fileName = site.getFileName();
		}
	},
	ITERATIONS / 10
));

// Deep call stack
function deepStackOrig10() { return originalCallsites(); }
function deepStackOrig9() { return deepStackOrig10(); }
function deepStackOrig8() { return deepStackOrig9(); }
function deepStackOrig7() { return deepStackOrig8(); }
function deepStackOrig6() { return deepStackOrig7(); }
function deepStackOrig5() { return deepStackOrig6(); }
function deepStackOrig4() { return deepStackOrig5(); }
function deepStackOrig3() { return deepStackOrig4(); }
function deepStackOrig2() { return deepStackOrig3(); }
function deepStackOrig1() { return deepStackOrig2(); }

function deepStackOpt10() { return optimizedCallsites(); }
function deepStackOpt9() { return deepStackOpt10(); }
function deepStackOpt8() { return deepStackOpt9(); }
function deepStackOpt7() { return deepStackOpt8(); }
function deepStackOpt6() { return deepStackOpt7(); }
function deepStackOpt5() { return deepStackOpt6(); }
function deepStackOpt4() { return deepStackOpt5(); }
function deepStackOpt3() { return deepStackOpt4(); }
function deepStackOpt2() { return deepStackOpt3(); }
function deepStackOpt1() { return deepStackOpt2(); }

results.push(compareScenario(
	'Scenario 6: Deep call stack (10 levels)',
	() => {
		const sites = deepStackOrig1();
		const fileName = sites[0].getFileName();
	},
	() => {
		const sites = deepStackOpt1();
		const fileName = sites[0].getFileName();
	},
	ITERATIONS / 10
));

// Memory comparison
console.log('\n' + '='.repeat(70));
console.log('Memory Usage Comparison');
console.log('='.repeat(70));

if (global.gc) {
	// Test original
	global.gc();
	const origMemBefore = process.memoryUsage();
	const origSites = [];
	for (let i = 0; i < 1000; i++) {
		origSites.push(originalCallsites());
	}
	const origMemAfter = process.memoryUsage();
	const origHeapUsed = (origMemAfter.heapUsed - origMemBefore.heapUsed) / 1024;

	// Test optimized
	global.gc();
	const optMemBefore = process.memoryUsage();
	const optSites = [];
	for (let i = 0; i < 1000; i++) {
		optSites.push(optimizedCallsites());
	}
	const optMemAfter = process.memoryUsage();
	const optHeapUsed = (optMemAfter.heapUsed - optMemBefore.heapUsed) / 1024;

	console.log(`\nMemory for 1000 callsites() calls:`);
	console.log(`  Original:  ${formatNumber(origHeapUsed)} KB`);
	console.log(`  Optimized: ${formatNumber(optHeapUsed)} KB`);
	console.log(`  Difference: ${formatPercent(origHeapUsed, optHeapUsed)}`);
}

// Overall summary
console.log('\n' + '='.repeat(70));
console.log('Overall Summary');
console.log('='.repeat(70));

const avgImprovement = results.reduce((sum, r) => sum + r.improvement, 0) / results.length;

console.log(`\nAverage performance improvement: ${formatNumber(avgImprovement)}%`);

console.log('\nOptimizations implemented:');
console.log('  1. Cached prepareStackTrace handler (avoids function recreation)');
console.log('  2. Lazy CallSite wrapper with property caching');
console.log('  3. Deferred computation of expensive CallSite methods');
console.log('  4. Optimized slice operation in prepareStackTrace');

console.log('\nKey improvements:');
results.forEach((result, index) => {
	console.log(`  Scenario ${index + 1}: ${result.improvement > 0 ? '+' : ''}${result.improvement.toFixed(1)}%`);
});

console.log('\nTarget improvement: 50-60% reduction in overhead');
console.log(`Achieved: ${avgImprovement.toFixed(1)}% average improvement`);

if (avgImprovement >= 50) {
	console.log('\n✓ Target achieved!');
} else if (avgImprovement >= 30) {
	console.log(`\n✓ Significant improvement achieved (${avgImprovement.toFixed(1)}%)`);
} else {
	console.log(`\n! Improvement is modest (${avgImprovement.toFixed(1)}%)`);
}
