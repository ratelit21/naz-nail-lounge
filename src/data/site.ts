export const BOOKING_URL = 'https://n1824990.yclients.com/';

export const site = {
  name: 'Naz Nail Lounge',
  city: 'Уфа',
  address: 'ул. Аксакова, 18',
  addressNote: 'вход со двора',
  postal: '450076',
  phones: [
    { label: '+7 987 601-21-42', href: 'tel:+79876012142' },
    { label: '+7 927 33-777-64', href: 'tel:+79273377764' },
  ],
  instagram: { label: '@naznail.ufa', href: 'https://instagram.com/naznail.ufa' },
  vk: { label: 'vk.com/naznail_ufa', href: 'https://vk.com/naznail_ufa' },
  map: 'https://2gis.ru/ufa/firm/70000001105686367',
  hoursNote: 'Открываемся с 10:00',
};

export const pages = {
  home: { label: 'Главная', href: '/' },
  atmosphere: { label: 'Атмосфера', href: '/atmosfera/' },
} as const;

/** Одно меню на обеих страницах — меняется только активный контекст. */
export const nav = [
  { label: 'Услуги', href: '/#services' },
  { label: 'Мастера', href: '/#team' },
  { label: 'Атмосфера', href: '/atmosfera/' },
  { label: 'Контакты', href: '/#booking' },
] as const;

export const serviceFrames = [
  { title: 'Маникюр', note: 'Уход и покрытие' },
  { title: 'Педикюр', note: 'Полный и экспресс' },
  { title: 'Брови', note: 'Оформление и цвет' },
  { title: 'Ресницы', note: 'Аккуратный акцент' },
] as const;

/** Временные AI-плейсхолдеры для проверки блока. Не сотрудники салона. */
export const teamSlots = [
  { name: 'Алина', role: 'Маникюр', tone: 'velvet' },
  { name: 'Мария', role: 'Педикюр', tone: 'copper' },
  { name: 'Елена', role: 'Брови', tone: 'cream' },
  { name: 'Дарья', role: 'Ресницы', tone: 'velvet' },
  { name: 'София', role: 'Уход', tone: 'copper' },
] as const;

export const copy = {
  heroHeadline: 'Пространство красоты и внимания',
  servicesTitle: 'Услуги',
  servicesLead: 'Маникюр, педикюр, брови и ресницы.',
  servicesNote: 'Цены и свободное время — в онлайн-записи.',
  teamEyebrow: 'Команда NAZ',
  teamTitle: 'Мастера NAZ',
  aboutEyebrow: 'Атмосфера',
  aboutTitle: 'Внутри NAZ',
  aboutBody: 'Зал, материалы и детали нашего пространства.',
  aboutLink: 'Смотреть атмосферу',
  bookingTitle: 'Запись',
  bookingLead: 'Выберите услугу и время в онлайн-записи.',
  cta: 'Записаться',
  atmosphereEyebrow: 'NAZ Nail Lounge',
  atmosphereTagline: 'Место, где можно замедлиться.',
  atmosphereBalance: 'Красота\nв балансе',
  atmosphereBody:
    'Тёплый свет, зелёный бархат и тихий ритм. Здесь нет спешки — только внимание к деталям и время для себя.',
};
