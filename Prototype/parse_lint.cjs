
const fs = require('fs');
const path = require('path');

try {
    let content = fs.readFileSync('lint_report_node.json', 'utf8');
    if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
    }
    const report = JSON.parse(content);
    const filesWithIssues = report.filter(file => file.errorCount > 0 || file.warningCount > 0);

    console.log(`Total files with issues: ${filesWithIssues.length}`);

    const plan = filesWithIssues.map(file => ({
        filePath: file.filePath,
        errors: file.messages
    }));
    fs.writeFileSync('fix_plan.json', JSON.stringify(plan, null, 2));
    console.log(`Plan generated with ${plan.length} files.`);
} catch (e) {
    console.error('Error parsing lint report:', e.message);
    if (e instanceof SyntaxError) {
        const match = e.message.match(/position (\d+)/);
        if (match) {
            const pos = parseInt(match[1]);
            const content = fs.readFileSync('lint_report.json', 'utf8');
            console.log('Context:', content.slice(Math.max(0, pos - 50), pos + 50));
        }
    }
}
