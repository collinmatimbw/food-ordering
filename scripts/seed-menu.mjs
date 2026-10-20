import fs from 'fs'

const img = (id) => `https://images.unsplash.com/${id}?w=640&q=75&auto=format&fit=crop`

const P = {
  steak: 'photo-1504674900247-0877df9cc836',
  saladBowl: 'photo-1546069901-ba9599a7e63c',
  pancakes: 'photo-1567620905732-2d1ec7ab7445',
  salad: 'photo-1540189549336-e6e99c3679fe',
  vegBowl: 'photo-1512621776951-a57141f2eefd',
  bowl: 'photo-1476224203421-9ac39bcb3327',
  table: 'photo-1414235077428-338989a2e8c0',
  pan: 'photo-1555939594-58d7cb561ad1',
  cake: 'photo-1565958011703-44f9829ba187',
  greens: 'photo-1482049016688-2d3e1b311543',
  veg: 'photo-1466637574441-749b8f19452f',
  meat: 'photo-1432139555190-58524dae6a55',
  bowl2: 'photo-1490645935967-10de6ba17061',
  toast: 'photo-1484723091739-30a097e8f929',
  spread: 'photo-1493770348161-369560ae357d',
  colorful: 'photo-1498837167922-ddd27525d352',
  rest: 'photo-1517248135467-4c7edcad34c4',
  brunch: 'photo-1533089860892-a7c6f0a88666',
  burger: 'photo-1551782450-a2132b4ba21d',
  coffee: 'photo-1529042410759-befb1204b468',
  bbq: 'photo-1544025162-d76694265947',
  rest2: 'photo-1559847844-5315695dadae',
  grill: 'photo-1607013251379-e6eecfffe234',
  curry: 'photo-1585032226651-759b368d7246',
  soup: 'photo-1626074353765-517a681e40be',
}

const data = {
  restaurant: {
    name: 'Mama Kilanga',
    tagline: 'Authentic Tanzanian kitchen · Mikocheni B, Dar es Salaam',
    currency: 'TSh',
    tables: 24,
  },
  categories: [
    { id: 'staples', name: 'Wali & Ugali', icon: 'Wheat' },
    { id: 'grill', name: 'Nyama Choma', icon: 'Flame' },
    { id: 'street', name: 'Street Food', icon: 'UtensilsCrossed' },
    { id: 'sides', name: 'Sides & Salads', icon: 'Salad' },
    { id: 'desserts', name: 'Vitumbua & More', icon: 'Cake' },
    { id: 'drinks', name: 'Vinywaji', icon: 'Coffee' },
  ],
  items: [
    { id: 'st-01', name: 'Wali wa Nazi na Samaki wa Kupaka', description: 'Coconut rice with fish in a rich peanut-coconut sauce. A Swahili classic.', price: 14000, icon: 'Fish', image: img(P.steak), category: 'staples', tags: ['Signature', 'Swahili'], rating: 4.8, prepMinutes: 18, gradient: 'from-sky-400 to-blue-600', available: true },
    { id: 'st-02', name: 'Pilau ya Nyama', description: 'Fragrant spiced pilau rice slow-cooked with tender beef and pilau masala.', price: 12000, icon: 'Utensils', image: img(P.curry), category: 'staples', tags: ['Popular', 'Spicy'], rating: 4.7, prepMinutes: 20, gradient: 'from-amber-400 to-orange-600', available: true },
    { id: 'st-03', name: 'Mchuzi wa Kuku na Wali', description: 'Creamy chicken curry served with steamed basmati rice and kachumbari.', price: 11000, icon: 'Drumstick', image: img(P.soup), category: 'staples', tags: ['Popular'], rating: 4.6, prepMinutes: 16, gradient: 'from-orange-400 to-rose-600', available: true },
    { id: 'st-04', name: 'Ugali na Mchuzi wa Maharage', description: 'Soft maize porridge with slow-simmered beans in coconut gravy.', price: 6000, icon: 'Wheat', image: img(P.bowl), category: 'staples', tags: ['Budget', 'Vegan'], rating: 4.5, prepMinutes: 10, gradient: 'from-amber-300 to-yellow-600', available: true },
    { id: 'st-05', name: 'Wali na Ndengu', description: 'Steamed rice with tender green grams stewed in tomato and onion.', price: 7000, icon: 'Leaf', image: img(P.vegBowl), category: 'staples', tags: ['Vegan'], rating: 4.4, prepMinutes: 12, gradient: 'from-emerald-400 to-teal-600', available: true },
    { id: 'st-06', name: 'Makande ya Pwani', description: 'Coconut bean stew with maize, a coastal comfort classic.', price: 7500, icon: 'Soup', image: img(P.bowl2), category: 'staples', tags: ['Coastal'], rating: 4.5, prepMinutes: 15, gradient: 'from-lime-400 to-emerald-700', available: true },

    { id: 'gr-01', name: 'Nyama Choma ya Mbuzi', description: 'Charcoal-grilled goat meat with kachumbari, na chuma ya pili pili.', price: 18000, icon: 'Beef', image: img(P.bbq), category: 'grill', tags: ['Signature', 'Grill'], rating: 4.9, prepMinutes: 25, gradient: 'from-rose-400 to-red-600', available: true },
    { id: 'gr-02', name: 'Mishkaki ya Nyama', description: 'Marinated beef skewers grilled over open coals. Served with chips or ugali.', price: 13000, icon: 'Flame', image: img(P.meat), category: 'grill', tags: ['Popular', 'Grill'], rating: 4.8, prepMinutes: 18, gradient: 'from-orange-400 to-red-600', available: true },
    { id: 'gr-03', name: 'Kuku Choma na Wali', description: 'Half chicken charcoal-grilled with African spices, rice and kachumbari.', price: 15000, icon: 'Drumstick', image: img(P.grill), category: 'grill', tags: ['Grill'], rating: 4.7, prepMinutes: 22, gradient: 'from-amber-400 to-orange-700', available: true },
    { id: 'gr-04', name: 'Samaki wa Kuchoma', description: 'Grilled tilapia stuffed with herbs, lemon and peri-peri butter.', price: 16000, icon: 'Fish', image: img(P.pan), category: 'grill', tags: ['Coastal', 'Grill'], rating: 4.6, prepMinutes: 24, gradient: 'from-sky-400 to-cyan-700', available: true },

    { id: 'stf-01', name: 'Chips Mayai', description: 'Crispy fries folded into a golden egg omelette. A Dar street legend.', price: 4000, icon: 'UtensilsCrossed', image: img(P.burger), category: 'street', tags: ['Street', 'Popular'], rating: 4.7, prepMinutes: 10, gradient: 'from-yellow-400 to-amber-600', available: true },
    { id: 'stf-02', name: 'Sambusa ya Nyama (4 pcs)', description: 'Golden pastry parcels spiced with beef, onion and cumin. Fried to order.', price: 3000, icon: 'Utensils', image: img(P.toast), category: 'street', tags: ['Snack'], rating: 4.5, prepMinutes: 8, gradient: 'from-amber-300 to-orange-500', available: true },
    { id: 'stf-03', name: 'Muhogo wa Kupaka', description: 'Boiled cassava tossed in a smoky coconut-peanut sauce.', price: 3500, icon: 'Leaf', image: img(P.veg), category: 'street', tags: ['Vegan', 'Coastal'], rating: 4.4, prepMinutes: 12, gradient: 'from-lime-400 to-emerald-600', available: true },
    { id: 'stf-04', name: 'Vitumbua', description: 'Fluffy coconut rice-flour doughnuts, pan-fried and dusted with sugar.', price: 2000, icon: 'Cookie', image: img(P.pancakes), category: 'street', tags: ['Sweet', 'Snack'], rating: 4.6, prepMinutes: 10, gradient: 'from-orange-300 to-rose-500', available: true },
    { id: 'stf-05', name: 'Viazi vya Karanga', description: 'Twice-fried sweet potatoes with a rich peanut and tomato relish.', price: 3000, icon: 'Salad', image: img(P.colorful), category: 'street', tags: ['Vegan'], rating: 4.3, prepMinutes: 12, gradient: 'from-amber-400 to-yellow-700', available: true },

    { id: 'sd-01', name: 'Kachumbari', description: 'Fresh tomato, red onion, coriander and chilli with a squeeze of lime.', price: 2000, icon: 'Salad', image: img(P.salad), category: 'sides', tags: ['Fresh', 'Vegan'], rating: 4.6, prepMinutes: 5, gradient: 'from-rose-300 to-red-500', available: true },
    { id: 'sd-02', name: 'Mchicha', description: 'Sautéed amaranth greens with onion, tomato and a hint of peanut.', price: 3000, icon: 'Leaf', image: img(P.greens), category: 'sides', tags: ['Vegan', 'Greens'], rating: 4.4, prepMinutes: 8, gradient: 'from-green-400 to-emerald-700', available: true },
    { id: 'sd-03', name: 'Chips za Nyombo', description: 'Golden hand-cut fries with house peri-peri seasoning.', price: 3500, icon: 'Utensils', image: img(P.brunch), category: 'sides', tags: ['Crispy'], rating: 4.5, prepMinutes: 9, gradient: 'from-yellow-400 to-amber-600', available: true },
    { id: 'sd-04', name: 'Supu ya Mbuzi', description: 'Slow-simmered goat broth with ginger, mchuzi spices and fresh herbs.', price: 4500, icon: 'Soup', image: img(P.spread), category: 'sides', tags: ['Warming'], rating: 4.5, prepMinutes: 15, gradient: 'from-stone-300 to-amber-600', available: true },

    { id: 'ds-01', name: 'Kashata', description: 'Crunchy coconut and peanut brittle — a Zanzibar favourite.', price: 1500, icon: 'Cookie', image: img(P.cake), category: 'desserts', tags: ['Sweet', 'Coastal'], rating: 4.7, prepMinutes: 5, gradient: 'from-orange-300 to-amber-600', available: true },
    { id: 'ds-02', name: 'Matunda ya Moto', description: 'Seasonal tropical fruit plate with lime and a dusting of chilli salt.', price: 4000, icon: 'Salad', image: img(P.saladBowl), category: 'desserts', tags: ['Fresh', 'Vegan'], rating: 4.6, prepMinutes: 6, gradient: 'from-pink-300 to-rose-500', available: true },
    { id: 'ds-03', name: 'Tiramisu ya Tangawizi', description: 'Our ginger-spiced twist on the Italian classic. Light and creamy.', price: 8000, icon: 'Cake', image: img(P.rest2), category: 'desserts', tags: ['Chef pick'], rating: 4.8, prepMinutes: 8, gradient: 'from-amber-400 to-orange-600', available: true },

    { id: 'dr-01', name: 'Kahawa ya Kijiko', description: 'Strong Tanzanian coffee, served black or with a splash of milk.', price: 2500, icon: 'Coffee', image: img(P.coffee), category: 'drinks', tags: ['Hot'], rating: 4.7, prepMinutes: 5, gradient: 'from-amber-600 to-stone-800', available: true },
    { id: 'dr-02', name: 'Jus ya Ndimi na Maembe', description: 'Creamy avocado and mango juice, blended fresh to order.', price: 4000, icon: 'GlassWater', image: img(P.rest), category: 'drinks', tags: ['Fresh', 'Popular'], rating: 4.8, prepMinutes: 6, gradient: 'from-lime-400 to-emerald-600', available: true },
    { id: 'dr-03', name: 'Chai ya Tangawizi', description: 'Spiced ginger tea with milk and a whisper of lemongrass.', price: 2500, icon: 'Milk', image: img(P.spread), category: 'drinks', tags: ['Warming'], rating: 4.5, prepMinutes: 6, gradient: 'from-orange-300 to-amber-500', available: true },
    { id: 'dr-04', name: 'Stoney Tangawzi', description: 'Ice-cold ginger soda. The real Dar refresher.', price: 1500, icon: 'Beer', image: img(P.table), category: 'drinks', tags: ['Cold'], rating: 4.6, prepMinutes: 2, gradient: 'from-amber-400 to-orange-500', available: true },
  ],
}

fs.writeFileSync('D:/food-order/server/data/menu.json', JSON.stringify(data, null, 2), 'utf8')
console.log(`Wrote menu: ${data.items.length} items, ${data.categories.length} categories`)
