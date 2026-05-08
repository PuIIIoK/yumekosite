export interface AnimePreview {
  id: number;
  title: string;
  ep: string;
  meta: string;
  rating: string;
  genres: string;
  poster: string;
}

export interface AnimeDetails extends AnimePreview {
  altTitle: string;
  synopsis: string;
  description: string;
  studio: string;
  season: string;
  year: string;
  format: string;
  episodes: string;
  duration: string;
  status: string;
  badges: string[];
  relatedIds: number[];
  anilibriaAlias?: string;
}

export const ratingAccent: Record<string, string> = {
  "12+": "#2dd4bf",
  "16+": "#f97316",
  "18+": "#ef4444",
};

export const getAccent = (rating: string) => ratingAccent[rating] ?? "#f97316";

export const animeCatalog: AnimeDetails[] = [
  {
    id: 1,
    title: "Магическая битва",
    altTitle: "Jujutsu Kaisen",
    ep: "Эпизод 24",
    meta: "2026 • Весна • ТВ",
    rating: "16+",
    genres: "Экшен • Сёнэн",
    poster: "https://shikimori.one/system/animes/original/40748.jpg",
    synopsis: "Проклятия становятся всё сильнее, а каждая новая схватка требует от героев ещё большей цены.",
    description: "История о борьбе с проклятиями, тяжёлых решениях и команде, которая продолжает идти вперёд даже тогда, когда мир вокруг трещит по швам. На странице собрана краткая информация по релизу, чтобы можно было быстро перейти к просмотру и понять, чего ждать от тайтла.",
    studio: "MAPPA",
    season: "Весна",
    year: "2026",
    format: "ТВ",
    episodes: "24 эпизода",
    duration: "24 мин",
    status: "Онгоинг",
    badges: ["Топ недели", "Сильный экшен"],
    relatedIds: [],
  },
  {
    id: 2,
    title: "Клинок, рассекающий демонов",
    altTitle: "Kimetsu no Yaiba",
    ep: "Эпизод 12",
    meta: "2026 • Весна • ТВ",
    rating: "18+",
    genres: "Экшен • Драма",
    poster: "https://shikimori.one/system/animes/original/38000.jpg",
    synopsis: "Новый виток путешествия, где каждая битва эмоционально тяжелее предыдущей.",
    description: "Красивый, напряжённый и очень динамичный релиз с упором на постановку боёв, драму персонажей и атмосферу опасного пути. Страница аниме показывает базовую информацию, текущий эпизод и ключевые особенности тайтла.",
    studio: "ufotable",
    season: "Весна",
    year: "2026",
    format: "ТВ",
    episodes: "12 эпизодов",
    duration: "24 мин",
    status: "Онгоинг",
    badges: ["Кинематографично", "Драма", "Фансервис битв"],
    relatedIds: [],
  },
  {
    id: 3,
    title: "Человек-бензопила",
    altTitle: "Chainsaw Man",
    ep: "Эпизод 8",
    meta: "2026 • Весна • ТВ",
    rating: "18+",
    genres: "Экшен • Ужасы",
    poster: "https://shikimori.one/system/animes/original/44511.jpg",
    synopsis: "Грубый, безумный и непредсказуемый мир, где цена силы всегда слишком высока.",
    description: "Мрачный релиз с агрессивной энергией, необычным визуальным ритмом и жёсткой подачей. Подходит, если тебе нужен тайтл с хаосом, кровью и очень живыми героями, которые постоянно балансируют на грани.",
    studio: "MAPPA",
    season: "Весна",
    year: "2026",
    format: "ТВ",
    episodes: "8 эпизодов",
    duration: "24 мин",
    status: "Онгоинг",
    badges: ["Жестко", "Мрачно", "Высокий темп"],
    relatedIds: [],
  },
  {
    id: 4,
    title: "Ванпанчмен",
    altTitle: "One Punch Man",
    ep: "Эпизод 6",
    meta: "2026 • Весна • ТВ",
    rating: "16+",
    genres: "Экшен • Комедия",
    poster: "https://shikimori.one/system/animes/original/30276.jpg",
    synopsis: "Когда герой слишком силён, настоящая интрига начинается в деталях и абсурде происходящего.",
    description: "Лёгкий по настроению, но эффектный по подаче тайтл, в котором комедия и экшен постоянно сменяют друг друга. На странице собраны ключевые характеристики релиза и его текущее состояние.",
    studio: "J.C.STAFF",
    season: "Весна",
    year: "2026",
    format: "ТВ",
    episodes: "6 эпизодов",
    duration: "24 мин",
    status: "Онгоинг",
    badges: ["Комедийный экшен", "Культовый герой", "Лёгкий вход"],
    relatedIds: [],
  },
  {
    id: 5,
    title: "Синий замок",
    altTitle: "Blue Lock",
    ep: "Эпизод 15",
    meta: "2026 • Весна • ТВ",
    rating: "12+",
    genres: "Спорт • Драма",
    poster: "https://shikimori.one/system/animes/original/49596.jpg",
    synopsis: "Спортивная амбиция, личное эго и давление конкуренции превращают матч в психологическую дуэль.",
    description: "Энергичный спортивный тайтл, где важны не только матчи, но и внутренний рост персонажей. Если нужен драйв, соперничество и командная химия — этот релиз отлично подходит.",
    studio: "8bit",
    season: "Весна",
    year: "2026",
    format: "ТВ",
    episodes: "15 эпизодов",
    duration: "24 мин",
    status: "Онгоинг",
    badges: ["Спорт", "Высокое напряжение", "Персонажный рост"],
    relatedIds: [],
  },
  {
    id: 6,
    title: "Стальной алхимик",
    altTitle: "Fullmetal Alchemist",
    ep: "Эпизод 40",
    meta: "2026 • Весна • ТВ",
    rating: "16+",
    genres: "Приключения • Фэнтези",
    poster: "https://shikimori.one/system/animes/original/5114.jpg",
    synopsis: "Большое путешествие, алхимия, цена ошибки и история, которая ощущается цельной от начала до конца.",
    description: "Приключенческий релиз с сильной драмой, насыщенным лором и большим количеством ярких персонажей. Страница тайтла помогает быстро сориентироваться по основным данным и текущему эпизоду.",
    studio: "Bones",
    season: "Весна",
    year: "2026",
    format: "ТВ",
    episodes: "40 эпизодов",
    duration: "24 мин",
    status: "Выходит",
    badges: ["Фэнтези", "Большой мир", "Классика"],
    relatedIds: [],
  },
  {
    id: 7,
    title: "Ангел по соседству меня ужасно балует 2",
    altTitle: "Otonari no Tenshi-sama ni Itsunomanika Dame Ningen ni Sareteita Ken 2",
    ep: "Эпизод 4",
    meta: "2026 • Весна • ТВ",
    rating: "16+",
    genres: "Романтика • Школа",
    poster: "https://anilibria.top/storage/releases/posters/10153/h5CIKx4FS1YB1xs2cMOQAIHmDc8JllX4.webp",
    synopsis: "Аманэ и Махиру теперь пара, но их ждут новые испытания под пристальным вниманием окружающих.",
    description: "После того как Аманэ и Махиру признались друг другу в чувствах на глазах у всей школы, их жизнь из тихой соседской идиллии превращается в официальный роман под пристальным вниманием окружающих. Теперь, когда маски сброшены, героям предстоит учиться быть настоящей парой не только за закрытыми дверями квартир, но и в глазах общества.",
    studio: "Project No.9",
    season: "Весна",
    year: "2026",
    format: "ТВ",
    episodes: "12 эпизодов",
    duration: "24 мин",
    status: "Онгоинг",
    badges: ["Романтика", "Школа"],
    relatedIds: [],
    anilibriaAlias: "otonari-no-tenshi-sama-ni-itsunomanika-dame-ningen-ni-sareteita-ken-2",
  },
  {
    id: 8,
    title: "Добро пожаловать в класс превосходства 4",
    altTitle: "Youkoso Jitsuryoku Shijou Shugi no Kyoushitsu e 4",
    ep: "Эпизод 6",
    meta: "2026 • Весна • ТВ",
    rating: "16+",
    genres: "Драма • Психологическое • Триллер • Школа",
    poster: "https://anilibria.top/storage/releases/posters/10155/jhv90futUWSwvjNJb6V9YGy5v8zC3PsJ.webp",
    synopsis: "Второй год обучения начинается с серии непростых экзаменов и знакомства с новыми первогодками.",
    description: "Аянокоджи и его одноклассники начинают свой второй год обучения в школе «Кёдо Икусей». Впереди их ждёт серия непростых экзаменов, а также знакомство с новой группой довольно своеобразных первогодок. Ученикам придётся быстро найти общий язык друг с другом, потому что первый экзамен объединит их классы в пары для письменного теста.",
    studio: "Lerche",
    season: "Весна",
    year: "2026",
    format: "ТВ",
    episodes: "16 эпизодов",
    duration: "24 мин",
    status: "Онгоинг",
    badges: ["Психологическое", "Триллер"],
    relatedIds: [],
    anilibriaAlias: "youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e-4th-season-2-nensei-hen-1-gakki",
  },
];

export const newEpisodes: AnimePreview[] = animeCatalog.map(({ id, title, ep, meta, rating, genres, poster }) => ({
  id,
  title,
  ep,
  meta,
  rating,
  genres,
  poster,
}));

export const getAnimeById = (id: string | number) => {
  const numericId = typeof id === "number" ? id : Number(id);
  if (!Number.isFinite(numericId)) {
    return undefined;
  }

  return animeCatalog.find((anime) => anime.id === numericId);
};
