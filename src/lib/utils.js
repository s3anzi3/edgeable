import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Matches emoji and their helpers: pictographics, skin-tone modifiers, flag
// (regional indicator) letters, the keycap combiner (U+20E3), variation
// selectors (U+FE00–U+FE0F), and zero-width joiners (U+200D) that stitch
// emoji sequences together.
const EMOJI_REGEX = /(?:\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Regional_Indicator}|⃣|[︀-️]|‍)/gu;

// Remove any emoji characters from a string. No-op for non-strings.
export function stripEmoji(value) {
  if (typeof value !== 'string') return value;
  return value.replace(EMOJI_REGEX, '');
}
