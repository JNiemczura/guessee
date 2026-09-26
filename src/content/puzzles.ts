import { addUtcDays, todayUtc } from "@/lib/dates";
import type { PuzzleKind, PuzzleStatus } from "@/lib/types";

export type SeedPuzzle = {
  id: string;
  kind: PuzzleKind;
  scheduledDate: string | null;
  category: string;
  answer: string;
  aliases: string[];
  clues: string[];
  explanation: string;
  difficulty: number;
  sourceNotes: string;
  status: PuzzleStatus;
  author: string;
  reviewer: string | null;
  ambiguityCheckedAt: string | null;
  attemptsAllowed: number;
  hintsAllowed: number;
};

const AUTHOR = "M. Konecka";
const REVIEWER = "R. Nowak";

type Draft = Omit<SeedPuzzle, "id" | "scheduledDate" | "status" | "author" | "reviewer" | "ambiguityCheckedAt"> & {
  status?: PuzzleStatus;
  author?: string;
  reviewer?: string | null;
  ambiguityCheckedAt?: string | null;
};

const DRAFTS: Draft[] = [
  {
    kind: "daily",
    category: "Science",
    answer: "Penicillin",
    aliases: [],
    clues: [
      "A mould discovered in 1928 changed medicine forever.",
      "It was the first antibiotic used in bulk during a world war.",
      "The scientist who noticed it killing bacteria was doing unrelated research on a contaminated plate.",
      "Turning it into a usable medicine took a team in Oxford and won them a Nobel Prize.",
      "It is still used today, though resistant bacteria are a growing problem.",
    ],
    explanation:
      "Alexander Fleming noticed the antibacterial mould in 1928. Howard Florey and Ernst Chain turned it into a usable drug, and their team shared the 1945 Nobel Prize in Physiology or Medicine. Mass production during the Second World War made it one of the most consequential discoveries of the century.",
    difficulty: 2,
    sourceNotes: "Nobel Prize facts from the Nobel Foundation; widely reported history.",
    attemptsAllowed: 5,
    hintsAllowed: 1,
  },
  {
    kind: "daily",
    category: "History",
    answer: "Gutenberg Bible",
    aliases: ["the Gutenberg Bible", "42 line bible", "42-line bible"],
    clues: [
      "Printed in a German city by a goldsmith whose technique came from wine presses.",
      "Roughly 180 copies left the workshop, and only a few dozen survive.",
      "Its title page names no author and carries no date, only a colophon praising the work.",
      "The largest surviving share, 19 copies, is held by one national library.",
      "Hand copying a book of that length cost around 30 florins, which is what made it revolutionary.",
    ],
    explanation:
      "Johannes Gutenberg printed the Bible in Mainz around 1454-1455 using movable metal type, an oil-based ink, and a modified wine press. About 49 copies are known to survive, 19 of them complete, and the British Library holds the largest group.",
    difficulty: 4,
    sourceNotes: "British Library and Gutenberg Museum collection records.",
    attemptsAllowed: 5,
    hintsAllowed: 1,
  },
  {
    kind: "daily",
    category: "Geography",
    answer: "Danube",
    aliases: ["the Danube", "Danube river"],
    clues: [
      "It rises in a country that borders both Switzerland and Austria.",
      "It is the second longest river in Europe.",
      "It touches or runs through ten countries, more than any other river in the world.",
      "Three capitals stand on its banks: Vienna, Bratislava and Budapest.",
      "It reaches the Black Sea through a wide delta in Romania.",
    ],
    explanation:
      "The Danube rises in the Black Forest in Germany and flows 2,850 km to the Danube Delta. Ten countries border or cross it, and four national capitals are on its banks once you count Belgrade.",
    difficulty: 2,
    sourceNotes: "International Commission for the Protection of the Danube River.",
    attemptsAllowed: 5,
    hintsAllowed: 1,
  },
  {
    kind: "daily",
    category: "Nature",
    answer: "Axolotl",
    aliases: ["axolotls", "Mexican walking fish"],
    clues: [
      "This salamander regrows whole limbs without leaving a scar.",
      "It keeps its larval gills for life instead of changing into a land adult.",
      "In the wild it survives in a single lake system in Mexico.",
      "It is named after an Aztec god, and the wild population is critically endangered.",
      "It eats tiny invertebrates it snaps up without moving, and it never seems to tire.",
    ],
    explanation:
      "The axolotl, Ambystoma mexicanum, is famous for regeneration and for neoteny: it reaches maturity while still keeping its gills. It is endemic to the canals of Xochimilco, where water quality and introduced fish have pushed it towards extinction in the wild.",
    difficulty: 4,
    sourceNotes: "IUCN Red List assessment; common zoological fact.",
    attemptsAllowed: 5,
    hintsAllowed: 1,
  },
  {
    kind: "daily",
    category: "Film",
    answer: "Casablanca",
    aliases: [],
    clues: [
      "A 1942 American romantic drama starring Humphrey Bogart and Ingrid Bergman.",
      "The war cost the production several weeks of shooting, and the sets were reused between films.",
      "The two leads had already starred together the year before in an adventure set in North Africa.",
      "The famous airport scene was shot on a soundstage, not in a real terminal.",
      "It was nominated for seven Academy Awards and won three of them.",
    ],
    explanation:
      "Casablanca (1942) was completed after the outbreak of war, which delayed production and forced the studio to recycle sets from other pictures. It won Best Picture, Best Director and Best Supporting Actress for Bergman, who famously did not know she had been nominated.",
    difficulty: 3,
    sourceNotes: "Academy Awards records; standard film history.",
    attemptsAllowed: 5,
    hintsAllowed: 1,
  },
  {
    kind: "daily",
    category: "Music",
    answer: "Tubular Bells",
    aliases: ["the Tubular Bells", "Tubular Bells"],
    clues: [
      "Its title comes from an instrument played by hand in an old London church.",
      "It opened the 1973 film The Exorcist and terrified audiences with its chime.",
      "The composer was a teenager working mostly alone when he recorded it.",
      "The first side runs over twenty minutes and was issued as a single.",
      "It spent fifteen weeks at number one and is credited with reviving the singles chart.",
    ],
    explanation:
      "Mike Oldfield recorded The Tubular Bells in 1973, largely at home and at age 19, for a documentary about the bells of St Luke's Church in London. It reached number one in 1974 and became one of the best selling instrumental singles ever, largely thanks to The Exorcist.",
    difficulty: 3,
    sourceNotes: "Official Charts Company; standard album history.",
    attemptsAllowed: 5,
    hintsAllowed: 1,
  },
  {
    kind: "daily",
    category: "Food",
    answer: "Miso",
    aliases: ["miso paste", "miso soup base"],
    clues: [
      "A fermented paste used as a seasoning and as the base of soups in Japan.",
      "It is made from soybeans and a mould culture called koji.",
      "A long fermentation gives it a salty depth that keeps improving with age.",
      "The oldest shops in the country keep recipes that have been unchanged for centuries.",
      "It is one of the main ingredients of ramen broth.",
    ],
    explanation:
      "Miso is made by combining soybeans with rice or barley and the koji mould, then fermenting it for weeks to years. Different grades and lengths of fermentation produce very different colours and strengths, and the paste keeps maturing in the jar.",
    difficulty: 2,
    sourceNotes: "Common culinary fact; no single rights holder.",
    attemptsAllowed: 5,
    hintsAllowed: 1,
  },
  {
    kind: "daily",
    category: "Sport",
    answer: "Pommel horse",
    aliases: ["the pommel horse", "pommel"],
    clues: [
      "An apparatus event in men's artistic gymnastics, and a women's one until 2024.",
      "Competitors swing their legs in wide circles while keeping the apparatus completely still.",
      "It entered the Olympic programme for men in 1924.",
      "Scoring combines a routine difficulty score with an execution score out of ten.",
      "Its name comes from the French word for the handle on a fencing sword.",
    ],
    explanation:
      "The pommel horse is one of the four men's apparatus in artistic gymnastics and was added to the women's programme at the Paris 2024 Olympics. The apparatus is named for the pommels, the handles of a fencing sword, which its shape resembles.",
    difficulty: 4,
    sourceNotes: "FIG rulebook; Paris 2024 programme change.",
    attemptsAllowed: 5,
    hintsAllowed: 1,
  },
  {
    kind: "daily",
    category: "Literature",
    answer: "Great Expectations",
    aliases: [],
    clues: [
      "A Victorian novel that opens with a child meeting a convict on a windswept marsh.",
      "The convict promises to return, and a reader who believes him waits a long time.",
      "It began as a short serial in a weekly magazine in 1860.",
      "The plot then follows a young man into a life of crime and punishment.",
      "It sold so fast in its first hardback edition that the publisher demanded a different ending.",
    ],
    explanation:
      "Great Expectations appeared in All the Year Round from December 1860, with the final two chapters added for the 1861 book edition, which ended ambiguously. The novel was republished under a new title only after Dickens's death, to avoid the impression of an autobiography.",
    difficulty: 3,
    sourceNotes: "Standard literary history; public domain text.",
    attemptsAllowed: 5,
    hintsAllowed: 1,
  },
  {
    kind: "daily",
    category: "Technology",
    answer: "Transistor",
    aliases: ["the transistor", "transistors"],
    clues: [
      "A small semiconductor device invented in 1947 at a American research laboratory.",
      "It was the first device that could act both as a switch and as an amplifier.",
      "Before it, radios and early computers relied on bulky, hot vacuum tubes.",
      "It made integrated circuits, and eventually microprocessors, possible.",
      "Kilby, Bardeen, Noyce and Hoerni all hold patents in this area from 1959 onwards.",
    ],
    explanation:
      "The transistor was demonstrated at Bell Labs in December 1947. Jack Kilby built a working germanium version at Texas Instruments in 1958, and Robert Noyce's planar silicon version at Fairchild in 1959 made mass production realistic, which is what led to integrated circuits.",
    difficulty: 3,
    sourceNotes: "Bell Labs and IEEE milestone records.",
    attemptsAllowed: 5,
    hintsAllowed: 1,
  },
  {
    kind: "daily",
    category: "Architecture",
    answer: "Fallingwater",
    aliases: ["Falling Water", "the Fallingwater"],
    clues: [
      "A house built directly on top of a waterfall in rural Pennsylvania.",
      "The architect refused to add a balcony because it would have blocked the view.",
      "It was designed for the Kaufmann family, who owned a department store.",
      "Most of its floor-to-ceiling windows are angled to follow the rock ledges beneath them.",
      "It was completed in 1939 but did not open to visitors until 1963.",
    ],
    explanation:
      "Frank Lloyd Wright designed Fallingwater for Edgar and Liliane Kaufmann in 1935 and it was completed in 1939. The Kaufmanns stayed in their Pittsburgh home until 1943, so the house was not seen by the public for another two decades.",
    difficulty: 4,
    sourceNotes: "Western Pennsylvania Conservancy records; standard architectural history.",
    attemptsAllowed: 5,
    hintsAllowed: 1,
  },
  {
    kind: "practice",
    category: "Mathematics",
    answer: "Fibonacci sequence",
    aliases: ["the Fibonacci sequence", "Fibonacci numbers", "Fibonacci series"],
    clues: [
      "A sequence in which each term is the sum of the two before it.",
      "It shows up in the arrangement of seeds in a sunflower and in the curve of a nautilus shell.",
      "A thirteenth-century Italian merchant, travelling to Tunis, wrote a book that brought it to European mathematicians.",
      "Ratios of later terms settle at a constant of about 1.618.",
      "The same sequence sits behind the petal counts of many common flowers.",
    ],
    explanation:
      "Leonardo of Pisa, better known as Fibonacci, described the sequence in Liber Abaci (1202) after meeting the numbers during trade in North Africa. The ratio of consecutive terms converges on the golden ratio, about 1.618.",
    difficulty: 3,
    sourceNotes: "Standard mathematics history; public domain text.",
    attemptsAllowed: 5,
    hintsAllowed: 1,
  },
  {
    kind: "practice",
    category: "Language",
    answer: "Palindrome",
    aliases: ["palindrome", "palindromes"],
    clues: [
      "A word, phrase or sentence that reads the same backwards as forwards.",
      "Its name comes from two Greek words meaning 'running back'.",
      "The single-word version is taught to children to reinforce letter order.",
      "The famous sentence attributed to Napoleon is longer in French than in English.",
      "The longest known example in a major world language runs to more than a thousand characters.",
    ],
    explanation:
      "The word comes from Greek palin 'backwards' and dromos 'running'. Single-word examples are standard classroom material, while the longest recorded palindromes tend to be sentences or even whole texts in languages other than English.",
    difficulty: 2,
    sourceNotes: "Common linguistic fact; no single rights holder.",
    attemptsAllowed: 5,
    hintsAllowed: 1,
  },
  {
    kind: "practice",
    category: "Space",
    answer: "Halley's Comet",
    aliases: ["Halley", "1P/Halley", "Comet Halley"],
    clues: [
      "A periodic comet that returns to the inner solar system about every 76 years.",
      "Its most recent close approach to the Sun was observed from space in 1986.",
      "It is named after the astronomer who predicted its return in 1705.",
      "Tidal forces venting from the nucleus have been proposed as the reason its period keeps shortening.",
      "Its nucleus is one of the darkest objects in the solar system.",
    ],
    explanation:
      "Edmond Halley predicted the comet's return in 1705, and it was last seen from Earth in 1986, when spacecraft from several agencies flew past. Measurements of its shrinking period suggest outgassing is slowly altering the orbit.",
    difficulty: 4,
    sourceNotes: "NASA and ESA mission records.",
    attemptsAllowed: 5,
    hintsAllowed: 1,
  },
  {
    kind: "practice",
    category: "Weather",
    answer: "El Nino",
    aliases: ["El Nino", "El Nino", "ENSO", "El Nino phenomenon"],
    clues: [
      "A warming of equatorial Pacific water that shifts weather patterns worldwide.",
      "It appears roughly every two to seven years, but never on a fixed schedule.",
      "The name is Spanish for 'the boy', because Peruvian fishermen noticed it around Christmas.",
      "Weaker monsoon rains in parts of South Asia in the same year are linked to it.",
      "Its opposite phase, a cooling of the same water, has its own name and its own effects.",
    ],
    explanation:
      "El Nino is the warm phase of the El Nino Southern Oscillation. Peruvian fishers observed the warm current arriving near Christmas and named it El Nino de la Cruz. Its opposite, La Nina, tends to bring heavier rain to parts of South Asia.",
    difficulty: 3,
    sourceNotes: "NOAA climate explanations; diacritic folding covers both spellings.",
    attemptsAllowed: 5,
    hintsAllowed: 1,
  },
  {
    kind: "practice",
    category: "Medicine",
    answer: "Insulin",
    aliases: ["insulins"],
    clues: [
      "A hormone that lets cells take glucose out of the blood.",
      "It is made in the pancreas, in clusters of cells called the islets of Langerhans.",
      "A 1921 experiment showed a crude extract could keep dogs alive after their pancreas was removed.",
      "The 1923 Nobel Prize went to the two researchers who isolated it.",
      "The earliest version came from cattle, and early patients suffered severe allergic reactions.",
    ],
    explanation:
      "Banting and Best isolated insulin at the University of Toronto in 1921 after Macleod's laboratory work on the pancreatic ducts. Banting and Macleod shared the 1923 Nobel Prize; Best was not recognised, and later attempts to correct that have continued for a century.",
    difficulty: 3,
    sourceNotes: "Nobel Foundation records; standard medical history.",
    attemptsAllowed: 5,
    hintsAllowed: 1,
  },
  {
    kind: "practice",
    category: "Art",
    answer: "Mondrian",
    aliases: ["Piet Mondrian", "Piet Mondrian"],
    clues: [
      "A Dutch painter whose abstract work in the 1930s used only horizontal and vertical black lines.",
      "The canvases are built from coloured rectangles, usually red, yellow, blue and white.",
      "He arrived at this style after moving to Paris in 1919.",
      "He spent most of his later life in New York after a church committee rejected his work in 1937.",
      "His studio kept a single real tree trunk, brought from his homeland, that was never used.",
    ],
    explanation:
      "Pi Mondrian moved to Paris in 1919 and developed Neoplasticism after encountering the work of Mondrian's own influence, the mathematician H.P. Berlage. His later New York years brought the loose black grids and primary colours seen in Broadway Boogie Woogie.",
    difficulty: 5,
    sourceNotes: "MoMA and Tate collection records.",
    attemptsAllowed: 5,
    hintsAllowed: 1,
  },
  {
    kind: "practice",
    category: "Law",
    answer: "Habeas corpus",
    aliases: ["habeas corpus", "the writ of habeas corpus"],
    clues: [
      "A legal writ that requires a detained person to be brought before a court.",
      "Its name comes from Latin for 'you shall have the body'.",
      "It is treated as a protection against unlawful detention.",
      "The principle was formally recognised in an English statute of 1679.",
      "Many national constitutions now state the right explicitly.",
    ],
    explanation:
      "Habeas corpus allows a person in custody to challenge the lawfulness of their detention before a court. The English Habeas Corpus Act 1679 followed the Rye House Plot, and the writ has since been written into many constitutions, including India's and South Africa's.",
    difficulty: 4,
    sourceNotes: "Standard legal history; no single rights holder for factual claims.",
    attemptsAllowed: 5,
    hintsAllowed: 1,
  },
  {
    kind: "practice",
    category: "Geography",
    answer: "Mariana Trench",
    aliases: ["the Mariana Trench", "Marianas Trench", "Mariana Deep"],
    clues: [
      "The deepest known point on the ocean floor.",
      "It lies in the western Pacific, along a chain of islands where two plates meet.",
      "A crewed descent in 1960 reached the bottom in a bathyscaphe with a spherical pressure hull.",
      "The depth is close to eleven kilometres below the surface.",
      "The islands above it are administered partly by Japan and partly by a United States territory.",
    ],
    explanation:
      "The Challenger Deep in the Mariana Trench is about 10,935 m deep, reached by Jacques Piccard and Don Walsh in 1960. The trench marks the subduction of the Pacific plate beneath the Mariana plate, north of which lie Guam and the Northern Mariana Islands.",
    difficulty: 4,
    sourceNotes: "NOAA and US Navy survey records; common geographic fact.",
    attemptsAllowed: 5,
    hintsAllowed: 1,
  },
];

/**
 * Builds the launch dataset.
 *
 * Daily slots are relative to the current UTC day so a fresh database always has
 * a playable puzzle for today, seven finished days behind it, and one reviewed
 * day scheduled ahead. Practice puzzles are separately labelled and never drawn
 * from the daily schedule.
 */
export function buildSeedPuzzles(now: Date = new Date()): SeedPuzzle[] {
  const today = todayUtc(now);
  const dailyDates = Array.from({ length: 8 }, (_, index) => addUtcDays(today, -index));
  const nextDate = addUtcDays(today, 1);

  const published = DRAFTS.slice(0, 8).map((draft, index) => ({
    ...draft,
    id: `pc-${dailyDates[index]}`,
    scheduledDate: dailyDates[index],
    status: "published" as PuzzleStatus,
    author: draft.author ?? AUTHOR,
    reviewer: draft.reviewer ?? REVIEWER,
    ambiguityCheckedAt: draft.ambiguityCheckedAt ?? `${dailyDates[index]}T09:00:00.000Z`,
  }));

  const scheduled = DRAFTS.slice(8, 9).map((draft) => ({
    ...draft,
    id: `pc-${nextDate}`,
    scheduledDate: nextDate,
    status: "scheduled" as PuzzleStatus,
    author: draft.author ?? AUTHOR,
    reviewer: draft.reviewer ?? REVIEWER,
    ambiguityCheckedAt: draft.ambiguityCheckedAt ?? `${today}T11:00:00.000Z`,
  }));

  const inReview = DRAFTS.slice(9, 10).map((draft, index) => ({
    ...draft,
    id: `pc-review-${String(index + 1).padStart(2, "0")}`,
    scheduledDate: null,
    status: "in_review" as PuzzleStatus,
    author: draft.author ?? AUTHOR,
    reviewer: null,
    ambiguityCheckedAt: null,
  }));

  const draft = DRAFTS.slice(10, 11).map((draft, index) => ({
    ...draft,
    id: `pc-draft-${String(index + 1).padStart(2, "0")}`,
    scheduledDate: null,
    status: "draft" as PuzzleStatus,
    author: draft.author ?? AUTHOR,
    reviewer: null,
    ambiguityCheckedAt: null,
  }));

  const practice = DRAFTS.slice(11).map((draft, index) => ({
    ...draft,
    id: `pc-practice-${String(index + 1).padStart(2, "0")}`,
    scheduledDate: null,
    status: "published" as PuzzleStatus,
    author: draft.author ?? AUTHOR,
    reviewer: draft.reviewer ?? REVIEWER,
    ambiguityCheckedAt: draft.ambiguityCheckedAt ?? `${today}T08:00:00.000Z`,
  }));

  return [...published, ...scheduled, ...inReview, ...draft, ...practice];
}
