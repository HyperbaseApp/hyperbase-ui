export default function formatFileSize(size: number) {
	let i = 0;
	while (i < 4) {
		const s = size / 1000;
		if (s > 1) {
			i++;
			size = s;
		} else {
			break;
		}
	}
	let unit = 'B';
	switch (i) {
		case 1:
			unit = 'KB';
			break;
		case 2:
			unit = 'MB';
			break;
		case 3:
			unit = 'GB';
		case 4:
			unit = 'TB';
	}
	let sizeStr = size.toString();
	for (let x = 0; x <= 3; ++x) {
		if (Math.floor(size * Math.pow(10, x)) === size * Math.pow(10, x)) {
			sizeStr = size.toFixed(x);
			break;
		} else if (x === 3) {
			sizeStr = size.toFixed(3);
			break;
		}
	}
	return `${sizeStr} ${unit}`;
}
