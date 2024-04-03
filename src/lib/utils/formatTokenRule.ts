export default function formatTokenRule(rule: string) {
	return rule
		.split('_')
		.map((r) => r[0].toUpperCase() + r.slice(1))
		.join(' ');
}
