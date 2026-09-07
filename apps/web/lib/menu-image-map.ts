const pdf = (name: string) => `/menu-images/${name}`

// The menu artwork is local so the QR menu still looks right during the demo without relying on
// a remote image host. Items not represented by a distinct PDF photo fall back to a category
// image; managers can later replace those with an uploaded or credited HTTPS image.
export const menuImageMap: Record<string, string> = {
  'Chicken Fried Rice': pdf('talker-02-04-c55b7bb0e7dd.png'),
  'Chicken Fried Rice Bowl': pdf('talker-02-04-c55b7bb0e7dd.png'),
  'Ugali': pdf('talker-01-03-557b63679a5a.png'),
  'Sukuma Wiki': pdf('talker-01-03-557b63679a5a.png'),
  'Beef Stew': pdf('talker-01-03-557b63679a5a.png'),
  'Grilled Chicken': pdf('talker-03-03-6508b6958b3a.png'),
  'Nyama Choma': pdf('talker-01-03-557b63679a5a.png'),
  'Kachumbari': pdf('menu-04-03-187a6995d155.png'),
  'Masala Chips': pdf('menu-06-05-400f1d2957d7.png'),
  'Fresh Passion Juice': pdf('talker-01-04-e3db71e68b66.png'),
  'Kenyan Tea': pdf('menu-02-03-4cbf57f79ba2.jpeg'),
  'Pasta': pdf('menu-04-02-9d10a3f15239.jpeg'),
  'Caesar Salad': pdf('menu-04-03-187a6995d155.png'),
  'Whole Fish': pdf('menu-05-03-251a6c90a3b8.png'),
  'Pilau': pdf('menu-05-04-1f241b4ca73b.png'),
  'White Forest Cake': pdf('menu-06-02-1a7d5b743efa.png'),
  'Red Velvet Cake': pdf('menu-06-03-0e83f4794b55.png'),
  'Chapati Rolls': pdf('menu-06-04-1da632fc8e00.png'),
  'Fries': pdf('menu-06-05-400f1d2957d7.png'),
  'Ice Cream': pdf('menu-06-06-adb56e5042cb.png'),
  'Pizza': pdf('menu-07-02-351221dfc50e.png'),
  'Garlic Bread': pdf('menu-07-03-6d8ef13fef30.png'),
  'Burgers': pdf('menu-08-02-1f66a78479c1.jpeg'),
  'Sandwich': pdf('menu-08-04-d14dfd4b2f3d.png'),
  'Milkshake': pdf('menu-10-02-50488a542531.png'),
  'Lemonade': pdf('menu-10-03-e3ef7b74d352.png'),
  'Smoothies': pdf('menu-10-04-95c59f255ece.png'),
  'Mocktails': pdf('menu-11-02-f434ebf53060.jpeg'),
}

export function menuImage(item: { name: string; imageUrl?: string; category?: string }): string {
  if (menuImageMap[item.name]) return menuImageMap[item.name]!
  const name = item.name.toLowerCase()
  if (name.includes('pizza')) return pdf('menu-07-02-351221dfc50e.png')
  if (name.includes('burger')) return pdf('menu-08-02-1f66a78479c1.jpeg')
  if (name.includes('sandwich')) return pdf('menu-08-04-d14dfd4b2f3d.png')
  if (name.includes('pasta') || name.includes('spaghetti')) return pdf('menu-04-02-9d10a3f15239.jpeg')
  if (name.includes('salad')) return pdf('menu-04-03-187a6995d155.png')
  if (name.includes('fish') || name.includes('tilapia')) return pdf('menu-05-03-251a6c90a3b8.png')
  if (name.includes('pilau') || name.includes('rice')) return pdf('talker-02-04-c55b7bb0e7dd.png')
  if (name.includes('cake') || name.includes('velvet') || name.includes('brownie') || name.includes('donut')) return pdf('menu-06-03-0e83f4794b55.png')
  if (name.includes('fries') || name.includes('chips') || name.includes('bhajia')) return pdf('menu-06-05-400f1d2957d7.png')
  if (name.includes('smoothie')) return pdf('menu-10-04-95c59f255ece.png')
  if (name.includes('lemonade') || name.includes('juice')) return pdf('menu-10-03-e3ef7b74d352.png')
  if (name.includes('mojito') || name.includes('mocktail')) return pdf('menu-11-02-f434ebf53060.jpeg')
  if (name.includes('soup') || name.includes('porridge')) return pdf('menu-09-03-7f054251da55.png')
  if (name.includes('coffee') || name.includes('cappuccino') || name.includes('latte') || name.includes('tea')) return pdf('menu-02-03-4cbf57f79ba2.jpeg')
  if (name.includes('omelette') || name.includes('pancake') || name.includes('egg') || name.includes('toast') || name.includes('muffin') || name.includes('croissant')) return pdf('talker-01-02-c26ce392dc8f.png')
  if (name.includes('chicken') || name.includes('beef') || name.includes('nyama') || name.includes('grill') || name.includes('wings')) return pdf('talker-03-03-6508b6958b3a.png')
  if (item.imageUrl) return item.imageUrl
  const byCategory: Record<string, string> = {
    drink: pdf('menu-10-03-e3ef7b74d352.png'), dessert: pdf('menu-06-02-1a7d5b743efa.png'),
    bread: pdf('menu-06-04-1da632fc8e00.png'), side: pdf('menu-06-05-400f1d2957d7.png'),
    meat: pdf('talker-03-03-6508b6958b3a.png'), vegetable: pdf('menu-04-03-187a6995d155.png'), staple: pdf('talker-02-04-c55b7bb0e7dd.png'),
  }
  return byCategory[item.category ?? 'staple'] ?? pdf('menu-04-02-9d10a3f15239.jpeg')
}
