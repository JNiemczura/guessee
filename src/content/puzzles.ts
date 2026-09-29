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
    aliases: ["the Gutenberg Bible", "42 line bible"],
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
    aliases: ["the Tubular Bells"],
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
    aliases: ["palindromes"],
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
    answer: "El Niño",
    aliases: ["ENSO", "El Niño phenomenon"],
    clues: [
      "A warming of equatorial Pacific water that shifts weather patterns worldwide.",
      "It appears roughly every two to seven years, but never on a fixed schedule.",
      "The name is Spanish for 'the boy', because Peruvian fishermen noticed it around Christmas.",
      "Weaker monsoon rains in parts of South Asia in the same year are linked to it.",
      "Its opposite phase, a cooling of the same water, has its own name and its own effects.",
    ],
    explanation:
      "El Niño is the warm phase of the El Niño Southern Oscillation. Peruvian fishers observed the warm current arriving near Christmas and named it El Niño de la Cruz. Its opposite, La Niña, tends to bring heavier rain to parts of South Asia.",
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
    aliases: ["Piet Mondrian"],
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
    aliases: ["the writ of habeas corpus"],
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
 * Forward buffer, dated ahead of the first scheduled day.
 *
 * These are authored and given a target date, but they stay in review on
 * purpose. The editorial gate refuses to schedule a daily without a second
 * reviewer and a ticked ambiguity check, and filling those fields in here would
 * invent the sign-off the gate exists to require. A reviewer opens each one,
 * adds their name, ticks the box, and moves it to scheduled; until then the
 * coverage alert correctly reports the buffer as unsatisfied.
 */
const FORWARD_DAILIES: Draft[] = [
  {
    kind: "daily",
    category: "Engineering",
    answer: "The Panama Canal",
    aliases: ["Panama Canal", "Panama ship canal"],
    clues: [
      "A cut through a strip of land that had forced ships to sail around the southern tip of a continent for centuries.",
      "The French tried to build it in the 1880s and stopped, after disease and bankruptcy.",
      "The United States finished it over the following two decades, and it opened to shipping in 1914.",
      "Ships do not sail through so much as climb it, in chambers filled with water and raised a few at a time.",
      "The treaty that governs it dates from 1903 and is one of the oldest agreements of its kind still in force.",
    ],
    explanation:
      "A canal across the Isthmus of Panama was attempted by Ferdinand de Lesseps in the 1880s, but the project failed on cost and tropical disease. The United States took it over under the Hay-Bunau-Varilla Treaty of 1903 and opened the canal on 15 August 1914. Ships are lifted through a staircase of locks rather than sailing a level waterway, and the treaty terms still govern the canal today.",
    difficulty: 3,
    sourceNotes: "Panama Canal authority history; the 1903 treaty is long-settled historical record.",
    attemptsAllowed: 5,
    hintsAllowed: 1,
  },
  {
    kind: "daily",
    category: "Astronomy",
    answer: "Pulsar",
    aliases: ["Neutron star", "pulsars"],
    clues: [
      "A steady radio pulse from a point in the sky, repeating with clock-like regularity, noticed by accident in 1967.",
      "The first two were nicknamed LGM-1 and LGM-2, and their astonishingly exact timing was the clue: nothing natural repeats that neatly.",
      "Each turned out to be a dead star spinning hundreds of times a second, about the size of a city.",
      "The researcher who spotted the pattern was widely blamed for the most famous prize in her field not going to her, and only got a large private award decades later.",
      "There are thousands of them across the galaxy, and at least one has a planet orbiting it.",
    ],
    explanation:
      "Jocelyn Bell Burnell noticed the first pulsars in 1967 while reviewing chart recordings, and they were initially nicknamed 'little green men'. They are rapidly rotating neutron stars. The 1974 Nobel Prize in Physics went to Antony Hewish and Martin Ryle; Bell Burnell, who made the discovery, was not included, and received a special Breakthrough Prize in 2018 instead. The first exoplanets ever confirmed were found orbiting a pulsar in 1992.",
    difficulty: 3,
    sourceNotes: "Nobel Prize 1974 facts; the 1992 pulsar planets are well documented.",
    attemptsAllowed: 5,
    hintsAllowed: 1,
  },
  {
    kind: "daily",
    category: "Biology",
    answer: "Mitochondria",
    aliases: ["Mitochondrion", "mitochondriae"],
    clues: [
      "Structures inside nearly every cell that supply most of its usable energy.",
      "They carry their own DNA, which is generally read as a leftover from when they were free-living bacteria.",
      "Your red blood cells have none of them, having discarded their nucleus to carry more oxygen.",
      "We inherit far more of their DNA than of the nucleus's, and that is how ancestry out of Africa was traced.",
      "Named for a Greek word meaning 'thread granule', after how they looked down a microscope.",
    ],
    explanation:
      "Mitochondria generate ATP through oxidative phosphorylation. The endosymbiotic theory, supported by their own DNA and their bacterial-like division, holds that they began as free-living bacteria taken up by another cell. They are maternally inherited, which made mitochondrial DNA central to tracing human migration out of Africa. Mature human red blood cells have no mitochondria.",
    difficulty: 4,
    sourceNotes: "Standard cell biology; mitochondrial DNA and maternal inheritance are textbook material.",
    attemptsAllowed: 5,
    hintsAllowed: 1,
  },
  {
    kind: "daily",
    category: "Photography",
    answer: "Daguerreotype",
    aliases: ["daguerreotypy"],
    clues: [
      "A photographic process announced in France in 1839 that recorded a unique image on a silvered copper plate, so no two were ever alike.",
      "It was named for the painter who announced it, an artist who had turned to chemistry.",
      "Exposures ran from minutes to tens of minutes, so sitters had to hold absolutely still, and the result looked like a mirror.",
      "The French government refused to patent it, decreeing that anyone might use it free of charge.",
      "One small portrait made by this process sold at auction in 2022 for more than a million dollars.",
    ],
    explanation:
      "Louis-Jacques-Mandry Daguerre announced the daguerreotype in 1839 after years of work with Joseph-Nicéphore Niépce, who made the first surviving photograph by an earlier version of the process. The French government made the process free to use rather than protecting it with a patent. Its long exposures and mirror-like appearance distinguish it from later processes; a daguerreotype portrait of a young woman sold for $1.2 million in November 2022.",
    difficulty: 4,
    sourceNotes: "Daguerre's process and the 1839 free-use decree are well documented; the 2022 auction result was widely reported.",
    attemptsAllowed: 5,
    hintsAllowed: 1,
  },
  {
    kind: "daily",
    category: "Shipping",
    answer: "Shipping container",
    aliases: ["Shipping containers", "Intermodal container", "freight container", "ISO container"],
    clues: [
      "A standardised steel box that turned loading a ship from days of manual work into a matter of cranes.",
      "The design was bought for one dollar by a trucking executive in 1937, and then sat unused for nearly twenty years.",
      "The first regular run belonged to an integrated oil company in 1956.",
      "International standards were agreed in 1970, and the box dimensions are tuned to how trucks and rail wagons stack.",
      "The majority of goods now moved around the world travel in one.",
    ],
    explanation:
      "Malcom McLean bought the container design for $1 in 1937 and revived it after the Second World War; Matson Line put the first converted containers on a regular run between Newark and Port Elizabeth in 1956. ISO standards were published in 1970, fixing dimensions such as the 20-foot and 40-foot boxes so ships, trains, and trucks could all handle them.",
    difficulty: 3,
    sourceNotes: "McLean's 1937 purchase and Matson's 1956 run are both documented; ISO 668 is the shipping standard.",
    attemptsAllowed: 5,
    hintsAllowed: 1,
  },
  {
    kind: "daily",
    category: "Cryptography",
    answer: "Playfair cipher",
    aliases: ["Playfair", "the Playfair cipher"],
    clues: [
      "A substitution scheme from 1854, the first to build its alphabet from a key phrase rather than from the letters themselves.",
      "A scientist invented it, but a friend who was a government official took the credit, because admitting to the invention was not his style.",
      "Its one real innovation was to encrypt letters in pairs, never one at a time.",
      "That same choice created its best-known weakness: a doubled letter breaks the pair, and two letters have to share one square.",
      "It was used in the First World War in a system that paired it with a second, transposition-based cipher.",
    ],
    explanation:
      "Charles Wheatstone devised the cipher in 1854; Lord Playfair promoted it and used it for official dispatches, preferring not to admit a scientist had invented it. The Playfair square is built from a keyword with duplicate letters and one letter usually dropped, and letters are encrypted in digraphs, which is why doubled letters and the J/I or Z collision are its weaknesses. The German ADFGX cipher of 1918 combined it with a columnar transposition.",
    difficulty: 3,
    sourceNotes: "Wheatstone/Playfair attribution is well established; ADFGX is documented in standard cryptography histories.",
    attemptsAllowed: 5,
    hintsAllowed: 1,
  },
  {
    kind: "daily",
    category: "Seismology",
    answer: "Richter scale",
    aliases: ["Richter magnitude scale", "Richter magnitude", "the Richter scale"],
    clues: [
      "A scale for the size of an earthquake, published in 1935, and still the word people use for one half a century after a successor was proposed.",
      "It is logarithmic: each whole step means about ten times the ground movement, and roughly thirty-one times the energy.",
      "It only holds for quakes recorded nearby, because the formula assumes the instrument is not too far from the epicentre.",
      "The highest reading ever reliably recorded at a single station was 9.5, from a Chilean earthquake in 1960.",
      "Its inventor had no training in seismology, and went into the field to measure distant earthquakes, which is what he found easier to compare.",
    ],
    explanation:
      "Charles F. Richter published his local magnitude scale in 1935 from work done at Caltech with Beno Gutenberg. Because it compares recordings from a single station it is only valid within a few hundred kilometres, which is why the moment magnitude scale, based on seismic moment and usable at any distance, superseded it scientifically from 1979. The 1960 Valdivia earthquake in Chile remains the largest ever instrumentally recorded.",
    difficulty: 3,
    sourceNotes: "Richter's 1935 paper and the 1979 moment magnitude scale are standard seismology references; the 1960 Chile event is the highest recorded magnitude.",
    attemptsAllowed: 5,
    hintsAllowed: 1,
  },
  {
    kind: "daily",
    category: "Typography",
    answer: "Leading",
    aliases: ["line spacing", "line space", "the leading"],
    clues: [
      "The blank vertical space between two lines of set type, and the thin metal strips that used to set it.",
      "Compositors spaced their lines by hand with those strips, so a missing strip meant a visible gap.",
      "The usual unit for it is the em, a width equal to the size of the type itself.",
      "The word is a printer's error: the strips were named after the metal, and the label's first letters ended up transposed.",
      "It survives as a piece of jargon long after the strips it describes stopped being used.",
    ],
    explanation:
      "Leading is the vertical distance between baselines, and the term comes from strips of lead or other metal used to separate lines of type in a composing stick. The common account is that a sticky note reading 'lead' and 'leading' led to the first letters being transposed, though this etymology is repeated so often it is hard to separate from folklore. The unit is normally the em.",
    difficulty: 4,
    sourceNotes: "The strips and the transposed-letters story are the standard account; the etymology is commonly repeated rather than firmly documented.",
    attemptsAllowed: 5,
    hintsAllowed: 1,
  },
  {
    kind: "daily",
    category: "Sculpture",
    answer: "Venus of Milo",
    aliases: ["Venus de Milo", "the Venus de Milo", "Aphrodite of Milos"],
    clues: [
      "A Hellenistic marble figure found in 1820 on a Greek island, missing both arms.",
      "The men who found her had almost no time to dig her out properly, and a French naval officer organised the excavation instead.",
      "For well over a century scholars argued about what she was holding, and the reconstructions included an apple, a set of scales and a ball.",
      "She was presented to France in the same year its king was beheaded, which was not the introduction anyone had planned.",
      "She was assumed to be the goddess of love until a plinth naming her was found with her remains in 1900.",
    ],
    explanation:
      "The statue was found on Milos in 1820 and excavated under the direction of Olivier Dumont d'Urville; she was presented to France in 1821, the year Louis XVIII was executed. Her missing arms prompted a long series of speculative reconstructions. An inscribed base found on Milos in 1897 and announced in 1900 identified her as Aphrodite of Milos, though the identification is not universally accepted.",
    difficulty: 3,
    sourceNotes: "The 1820 Milos find, the 1900 inscribed plinth, and the disputed attribution are all documented museum and archaeological record.",
    attemptsAllowed: 5,
    hintsAllowed: 1,
  },
  {
    kind: "daily",
    category: "Postal history",
    answer: "Penny Black",
    aliases: ["the Penny Black", "Penny Black stamp"],
    clues: [
      "The first postage stamp ever issued, in May 1840, and it still carries no name of any country.",
      "The profile on it is a queen, and the two letters in the top corner are the postmark that made it usable.",
      "A collector who wanted one already postmarked had to have a black bar painted over the face, or a red one instead.",
      "Its price was fixed by an act of Parliament, at a single penny for a letter anywhere in the country.",
      "Roughly a million survive, which makes it one of the most common stamps in the world.",
    ],
    explanation:
      "The Penny Black was issued on 6 May 1840 under the Penny Post Act of 1838, which fixed the letter rate at one penny. The 'C' and 'R' in the corners stood for Charles Regina and served as the cancelling postmark; stamps used before that date are known as 'Too Late'. Mail coaches and other early examples were obliterated with black or red bars.",
    difficulty: 4,
    sourceNotes: "Issue date, the Penny Post Act rate, the C R postmark and the Too Late obliteration are all standard philatelic record; surviving population is around one million.",
    attemptsAllowed: 5,
    hintsAllowed: 1,
  },
  {
    kind: "daily",
    category: "Statistics",
    answer: "Simpson's paradox",
    aliases: ["Simpson paradox", "the Simpson paradox"],
    clues: [
      "A 1974 example showed a treatment saving men's lives in one group and appearing to kill them in another, with no change to the underlying data.",
      "Split the same patients by the size of their kidney stones, or by a doctor's experience, and the direction of the result reverses.",
      "It was noticed in a study of medical admissions at Berkeley in 1971, where most departments went against the overall trend.",
      "The cause is always the same: a third factor that is distributed unevenly between the two groups being compared.",
      "It is why the first question about any comparison is how the groups were defined, not how big the difference is.",
    ],
    explanation:
      "Edward Simpson illustrated the effect in 1974 using Berkeley graduate admissions, where most departments appeared to discriminate against women even though overall admission rates favoured men. In the classic kidney-stone example, survival under both treatments rises when the small and large stone cases are separated, and falls when they are pooled. The effect arises from confounding: a lurking variable distributed differently between groups.",
    difficulty: 4,
    sourceNotes: "The 1974 paper and the Berkeley admissions and kidney-stone examples are standard statistics teaching material.",
    attemptsAllowed: 5,
    hintsAllowed: 1,
  },
  {
    kind: "daily",
    category: "Archaeology",
    answer: "Antikythera mechanism",
    aliases: ["Antikythera device", "Antikythera Machine"],
    clues: [
      "It was raised from a Roman-era shipwreck in 1900, and it remains the only known example of its kind from the ancient world.",
      "A bundle of corroded bronze gears about the size of a shoebox, it modelled the calendar, the seasons and the phases of the Moon.",
      "Its teeth encoded a 223-month cycle of eclipses, so its builder could forecast them decades ahead from a dial.",
      "Inscriptions on the fragments once pointed to Corinth, but lettering compared with known monuments shifted the origin to Syracuse.",
      "Tomography in 2005 exposed more than thirty gears, including a differential arrangement with no known parallel until the eighteenth century.",
    ],
    explanation:
      "The Antikythera mechanism was recovered by sponge divers from a wreck off the Greek island in 1900 and 1901, and is usually described as the first analogue computer. A hand-turned crank drove a train of at least thirty surviving bronze gears, displaying the calendar, the four-year and nineteen-year cycles, and the positions of the Sun and Moon. Its tooth counts encode the Saros cycle of 223 synodic months, letting its operator predict eclipse dates and whether an eclipse would be annular or total. Greek inscriptions found on the fragments refer to Syracuse and to a maker named for the island, which is why the modern name follows the wreck rather than the workshop.",
    difficulty: 4,
    sourceNotes:
      "Recovery dates and the 2005 X-ray tomography survey are from the published studies of the Antikythera fragments held in the National Archaeological Museum, Athens. The 223-month Saros and the differential gearing are the standard readings. Attribution to Syracuse rests on inscription lettering and remains the leading interpretation rather than a settled fact.",
    attemptsAllowed: 5,
    hintsAllowed: 1,
  },
];

/**
 * Builds the launch dataset.
 *
 * Daily slots are relative to the current UTC day so a fresh database always has
 * a playable puzzle for today, seven finished days behind it, one reviewed day
 * scheduled ahead, and a forward buffer of authored dailies waiting on review.
 * Practice puzzles are separately labelled and never drawn from the daily
 * schedule.
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

  // The two dailies the editor had already written but never dated. A daily is
  // dated when it is authored, not when it is scheduled (see EditorBoard), and
  // an undated daily can never pass validation, so they take the next two slots.
  const inReview = DRAFTS.slice(9, 10).map((draft, index) => ({
    ...draft,
    id: `pc-review-${String(index + 1).padStart(2, "0")}`,
    scheduledDate: addUtcDays(today, 2),
    status: "in_review" as PuzzleStatus,
    author: draft.author ?? AUTHOR,
    reviewer: null,
    ambiguityCheckedAt: null,
  }));

  const draft = DRAFTS.slice(10, 11).map((draft, index) => ({
    ...draft,
    id: `pc-draft-${String(index + 1).padStart(2, "0")}`,
    scheduledDate: addUtcDays(today, 3),
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

  const forward = FORWARD_DAILIES.map((draft, index) => {
    const dateKey = addUtcDays(today, 4 + index);
    return {
      ...draft,
      id: `pc-${dateKey}`,
      scheduledDate: dateKey,
      status: "in_review" as PuzzleStatus,
      author: draft.author ?? AUTHOR,
      reviewer: null,
      ambiguityCheckedAt: null,
    };
  });

  return [...published, ...scheduled, ...inReview, ...draft, ...practice, ...forward];
}
