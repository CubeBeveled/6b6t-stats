import chalk from 'chalk';

export const colors = {
  "0": chalk.black,
  "1": chalk.blue,
  "2": chalk.green,
  "3": chalk.cyan,
  "4": chalk.red,
  "5": chalk.magenta,
  "6": chalk.yellow,
  "7": chalk.gray,
  "8": chalk.gray.bold,
  "9": chalk.blueBright,
  "a": chalk.greenBright,
  "b": chalk.cyanBright,
  "c": chalk.redBright,
  "d": chalk.magentaBright,
  "e": chalk.yellowBright,
  "f": chalk.white,
  "l": '',
  "o": ''
}


export function convertColors(text) {
  let result = '';
  let currentColor;
  let i = 0;

  while (i < text.length) {
    const currentChar = text[i];

    if (currentChar === '§') {
      const colorCode = text[i + 1];
      let colorFunction;

      if (colorCode === '7') {
        currentColor = chalk.cyan;
        i += 2;
        continue;
      } else if (colorCode === 'l') {
        i += 2;
        continue;
      } else {
        colorFunction = colors[colorCode];

        if (colorFunction) {
          currentColor = colorFunction;
          i += 2;
          continue;
        }
      }
    }

    result += currentColor ? currentColor(currentChar) : currentChar;
    i++;
  }

  return result;
}

export function random(list) {
  return list[Math.floor((Math.random() * list.length))];
}

export async function sleep(millis) { return new Promise(resolve => setTimeout(resolve, millis)) }

export function makeid(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

export function randomizeCase(str) {
  var randomized = ""
  for (var i = 0; i < str.length; i++) {
    if (Math.floor(Math.random() * 10) < 5) {
      randomized += str.charAt(i).toUpperCase();
    } else {
      randomized += str.charAt(i).toLowerCase();
    }
  }

  return randomized
}

function leetConverter(str) {
  var leetConverter = str.replace(/A/g, "4").replace(/a/g, "@").replace(/B/g, "8").replace(/b/g, "6").replace(/C/g, "[").replace(/E/g, "3").replace(/g/g, "9").replace(/I/g, "|").replace(/J/g, "]").replace(/O/g, "0").replace(/T/g, "7").replace(/l/g, "1").replace(/S/g, "$").replace(/s/g, "5").replace(/t/g, "+").replace(/Z/g, "2");
  return leetConverter;
}

export function randomLeet(str) {
  var randomized = ""
  for (var i = 0; i < str.length; i++) {
    if (Math.floor(Math.random() * 10) < 5) {
      randomized += leetConverter(str.charAt(i));
    } else {
      randomized += str.charAt(i)
    }
  }

  return randomized
}

export function range(start, stop, step) {
  if (typeof stop == 'undefined') {
    // one param defined
    stop = start;
    start = 0;
  }

  if (typeof step == 'undefined') {
    step = 1;
  }

  if ((step > 0 && start >= stop) || (step < 0 && start <= stop)) {
    return [];
  }

  var result = [];
  for (var i = start; step > 0 ? i < stop : i > stop; i += step) {
    result.push(i);
  }

  return result;
}

export function formatTimeOfDay(ticks) {
  const ticksPerDay = 24000;
  const timePeriods = [
    { name: "Night", start: 13000, end: 23000 },
    { name: "Sunrise", start: 23000, end: 23500 },
    { name: "Day", start: 0, end: 1000 },
    { name: "Noon", start: 6000, end: 8000 },
    { name: "Sunset", start: 12000, end: 12500 },
    { name: "Midnight", start: 18000, end: 18500 }
  ];

  const tickOfDay = ticks % ticksPerDay;

  for (const period of timePeriods) {
    if (tickOfDay >= period.start && tickOfDay < period.end) {
      return period.name;
    }
  }

  return "Day";
}

export function formatMoonPhase(moonPhase) {
  const moonPhases = [
    'Full Moon',
    'Waning Gibbous',
    'Last Quarter',
    'Waning Crescent',
    'New Moon',
    'Waxing Crescent',
    'First Quarter',
    'Waxing Gibbous'
  ];

  if (moonPhase >= 0 && moonPhase < moonPhases.length) {
    return moonPhases[moonPhase];
  } else {
    return 'Unknown';
  }
}