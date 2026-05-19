const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const imageMap = {
  // === PAGES 2-3: Fruit category buttons ===
  'pg2-apples':        'https://pngimg.com/uploads/apple/apple_PNG12405.png',
  'pg2-apricots':      'https://pngimg.com/uploads/apricot/apricot_PNG12647.png',
  'pg2-avocados':      'https://pngimg.com/uploads/avocado/avocado_PNG15486.png',
  'pg2-bananas':       'https://pngimg.com/uploads/banana/banana_PNG835.png',
  'pg2-cherries':      'https://pngimg.com/uploads/cherry/cherry_PNG3078.png',
  'pg2-coconut':       'https://pngimg.com/uploads/coconut/coconut_PNG108882.png',
  'pg2-custard-apple': 'https://toppng.b-cdn.net/uploads/preview/custard-apple-11528341289gx6ahtdkcn.png',
  'pg2-dragon-fruit':  'https://pngimg.com/uploads/pitaya/pitaya_PNG38.png',
  'pg2-figs':          'https://pngfre.com/wp-content/uploads/Fig-1.png',
  'pg2-grapefruit':    'https://pngimg.com/uploads/grapefruit/grapefruit_PNG15263.png',
  'pg2-grapes':        'https://pngimg.com/uploads/grape/grape_PNG2983.png',
  'pg2-guava':         'https://pngimg.com/uploads/guava/guava_PNG56.png',
  'pg2-kiwi':          'https://pngimg.com/uploads/kiwi/kiwi_PNG4010.png',
  'pg2-lemons':        'https://shop.coles.com.au/wcsstore/Coles-CAS/images/5/3/1/5318302-zm.jpg',
  'pg2-limes':         'https://shop.coles.com.au/wcsstore/Coles-CAS/images/1/9/7/197594-zm.jpg',
  'pg2-longan':        'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/4/0/4409923-zm.jpg',
  'pg2-lychee':        'https://shop.coles.com.au/wcsstore/Coles-CAS/images/1/5/6/156542-zm.jpg',
  'pg2-mandarins':     'https://shop.coles.com.au/wcsstore/Coles-CAS/images/8/2/2/8223825-zm.jpg',
  'pg2-mangoes':       'https://shop.coles.com.au/wcsstore/Coles-CAS/images/8/9/2/8925050-zm.jpg',
  'pg2-melons':        'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/2/8/428915-zm.jpg',

  'pg3-nectarines':    'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/0/9/409808-zm.jpg',
  'pg3-oranges':       'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/2/5/4255717-zm.jpg',
  'pg3-papaya':        'https://shop.coles.com.au/wcsstore/Coles-CAS/images/6/9/5/6950578-zm.jpg',
  'pg3-passion-fruit': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/5/4/1/5415852-zm.jpg',
  'pg3-pawpaw':        'https://shop.coles.com.au/wcsstore/Coles-CAS/images/8/8/7/8875214-zm.jpg',
  'pg3-peaches':       'https://shop.coles.com.au/wcsstore/Coles-CAS/images/1/5/6/156713-zm.jpg',
  'pg3-pears':         'https://shop.coles.com.au/wcsstore/Coles-CAS/images/1/5/6/156258-zm.jpg',
  'pg3-persimmons':    'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/1/0/410035-zm.jpg',
  'pg3-plums':         'https://shop.coles.com.au/wcsstore/Coles-CAS/images/1/5/6/156382-zm.jpg',
  'pg3-pomegranate':   'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/5/1/4519320-zm.jpg',
  'pg3-pommelo':       'https://shop.coles.com.au/wcsstore/Coles-CAS/images/5/9/0/5907370-zm.jpg',
  'pg3-quince':        'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/1/0/410115-zm.jpg',
  'pg3-pineapple-md':  'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/1/0/410046-zm.jpg',
  'pg3-pineapple-sm':  'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/1/0/410046-zm.jpg',
  'pg3-pineapple-xl':  'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/1/0/410046-zm.jpg',
  'pg3-tangello':      'https://shop.coles.com.au/wcsstore/Coles-CAS/images/6/8/0/6803198-zm.jpg',

  // === PAGES 4-5: Vegetable category buttons ===
  'pg4-asian-vege':    'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/5/6/4565907-zm.jpg',
  'pg4-asparagus':     'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/8/3/4838737-zm.jpg',
  'pg4-beans':         'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/0/7/407675-zm.jpg',
  'pg4-beetroot':      'https://shop.coles.com.au/wcsstore/Coles-CAS/images/5/2/8/5288711-zm.jpg',
  'pg4-bottle-gourd':  'https://shop.coles.com.au/wcsstore/Coles-CAS/images/6/6/3/6630216-zm.jpg',
  'pg4-broccoli':      'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/0/7/407755-zm.jpg',
  'pg4-brussels':      'https://shop.coles.com.au/wcsstore/Coles-CAS/images/9/9/8/9989810-zm.jpg',
  'pg4-cabbage':       'https://shop.coles.com.au/wcsstore/Coles-CAS/images/7/2/3/7233448-zm.jpg',
  'pg4-capsicum':      'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/5/8/4580208-zm.jpg',
  'pg4-carrot-bag':    'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/2/2/4223335-zm.jpg',
  'pg4-carrots':       'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/2/2/4223335-zm.jpg',
  'pg4-cauliflower':   'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/6/0/4601603-zm.jpg',
  'pg4-celeriac':      'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/8/9/4894352-zm.jpg',
  'pg4-celery':        'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/8/4/4845732-zm.jpg',
  'pg4-chillies':      'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/6/5/4657244-zm.jpg',
  'pg4-chokos':        'https://shop.coles.com.au/wcsstore/Coles-CAS/images/5/2/2/5229814-zm.jpg',
  'pg4-corn':          'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/5/6/4562603-zm.jpg',
  'pg4-cucumbers':     'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/5/7/4575208-zm.jpg',
  'pg4-eggplant':      'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/5/8/4583206-zm.jpg',
  'pg4-leb-eggplant':  'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/5/8/4583261-zm.jpg',
  'pg4-fennel':        'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/9/1/4910980-zm.jpg',
  'pg4-garlic':        'https://shop.coles.com.au/wcsstore/Coles-CAS/images/6/1/0/6105715-zm.jpg',
  'pg4-ginger':        'https://shop.coles.com.au/wcsstore/Coles-CAS/images/5/0/3/5034484-zm.jpg',

  'pg5-herbs':         'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/5/7/4575569-zm.jpg',
  'pg5-kale':          'https://shop.coles.com.au/wcsstore/Coles-CAS/images/8/6/9/8696598-zm.jpg',
  'pg5-leeks':         'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/5/9/4595930-zm.jpg',
  'pg5-lettuce-bags':  'https://shop.coles.com.au/wcsstore/Coles-CAS/images/6/8/8/6885716-zm.jpg',
  'pg5-lettuces':      'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/5/8/4584071-zm.jpg',
  'pg5-lobok':         'https://shop.coles.com.au/wcsstore/Coles-CAS/images/6/6/1/6614720-zm.jpg',
  'pg5-mushrooms':     'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/8/2/4829420-zm.jpg',
  'pg5-olives':        'https://shop.coles.com.au/wcsstore/Coles-CAS/images/7/5/7/7572738-zm.jpg',
  'pg5-snow-peas':     'https://shop.coles.com.au/wcsstore/Coles-CAS/images/1/2/3/123328-zm.jpg',
  'pg5-onions':        'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/8/0/4803991-zm.jpg',
  'pg5-parsnip':       'https://shop.coles.com.au/wcsstore/Coles-CAS/images/5/1/0/5108183-zm.jpg',
  'pg5-peas':          'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/3/8/438409-zm.jpg',
  'pg5-sugar-snap':    'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/6/1/4619289-zm.jpg',
  'pg5-swedes':        'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/9/6/4966930-zm.jpg',
  'pg5-sweet-potato':  'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/1/9/4199503-zm.jpg',
  'pg5-tomatoes':      'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/8/3/4835171-zm.jpg',
  'pg5-turnip':        'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/9/6/4966737-zm.jpg',
  'pg5-zucchini':      'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/9/1/4910506-zm.jpg',
  'pg5-potatoes':      'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/2/1/4217241-zm.jpg',
  'pg5-pumpkins':      'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/1/8/4183558-zm.jpg',
  'pg5-radish':        'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/9/1/4911870-zm.jpg',
  'pg5-rhubarb':       'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/0/8/408372-zm.jpg',
  'pg5-shallots':      'https://shop.coles.com.au/wcsstore/Coles-CAS/images/5/1/3/5134809-zm.jpg',
  'pg5-silverbeet':    'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/0/8/408383-zm.jpg',

  // === PAGE 7: Apple varieties ===
  'pg7-btn0':  'https://pngimg.com/d/apple_PNG12462.png',          // Bravo
  'pg7-btn12': 'https://pngimg.com/d/apple_PNG12489.png',          // Fuji
  'pg7-btn10': 'https://pngimg.com/uploads/apple/apple_PNG12507.png', // Granny Smith
  'pg7-btn4':  'https://pngimg.com/d/apple_PNG12432.png',          // Jazz
  'pg7-btn9':  'https://pngimg.com/d/apple_PNG12406.png',          // Kanzi
  'pg7-btn7':  'https://pngimg.com/uploads/apple/apple_PNG12507.png', // Large Granny Smith
  'pg7-btn6':  'https://pngimg.com/uploads/apple/apple_PNG12405.png', // Large Pink Lady
  'pg7-btn8':  'https://pngimg.com/uploads/apple/apple_PNG12509.png', // Large Royal Gala
  'pg7-btn5':  'https://pngimg.com/uploads/apple/apple_PNG12441.png', // Red Apple
  'pg7-btn11': 'https://pngimg.com/uploads/apple/apple_PNG12441.png', // Red Delicious
  'pg7-btn2':  'https://pngimg.com/uploads/apple/apple_PNG12507.png', // Small Granny Smith
  'pg7-btn1':  'https://pngimg.com/uploads/apple/apple_PNG12405.png', // Small Pink Lady
  'pg7-btn3':  'https://pngimg.com/uploads/apple/apple_PNG12509.png', // Small Royal Gala

  // === PAGE 9: Avocado varieties ===
  'pg9-btn4':  'https://pngimg.com/uploads/avocado/avocado_PNG15486.png', // Bag
  'pg9-btn0':  'https://pngimg.com/uploads/avocado/avocado_PNG15486.png', // Hass
  'pg9-btn1':  'https://pngimg.com/uploads/avocado/avocado_PNG15488.png', // Reed
  'pg9-btn2':  'https://pngimg.com/uploads/avocado/avocado_PNG15472.png', // Shepard
  'pg9-btn3':  'https://pngimg.com/uploads/avocado/avocado_PNG15486.png', // Small

  // === PAGE 10: Banana varieties ===
  'pg10-btn2': 'https://pngimg.com/uploads/banana/banana_PNG835.png',  // Cavendish
  'pg10-btn0': 'https://pngimg.com/uploads/banana/banana_PNG835.png',  // Cavendish KG
  'pg10-btn1': 'https://pngimg.com/uploads/banana/banana_PNG842.png',  // Lady Finger
  'pg10-btn3': 'https://pngimg.com/uploads/banana/banana_PNG842.png',  // Ladyfinger

  // === PAGE 11: Grape varieties ===
  'pg11-btn4': 'https://pngimg.com/uploads/grape/grape_PNG2955.png',   // Black Muscat
  'pg11-btn2': 'https://pngimg.com/uploads/grape/grape_PNG2955.png',   // Black Seedless
  'pg11-btn3': 'https://pngimg.com/uploads/grape/grape_PNG2983.png',   // Autumn
  'pg11-btn1': 'https://pngimg.com/uploads/grape/grape_PNG2987.png',   // Red Seedless
  'pg11-btn0': 'https://pngimg.com/uploads/grape/grape_PNG2996.png',   // White Seedless

  // === PAGE 12: Kiwi varieties ===
  'pg12-btn1': 'https://pngimg.com/uploads/kiwi/kiwi_PNG4028.png',    // Gold
  'pg12-btn0': 'https://pngimg.com/uploads/kiwi/kiwi_PNG4010.png',    // Regular

  // === PAGE 13: Lemon varieties ===
  'pg13-btn1': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/5/3/1/5318302-zm.jpg',
  'pg13-btn0': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/5/3/1/5318302-zm.jpg',

  // === PAGE 14: Lime varieties ===
  'pg14-btn1': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/1/9/7/197594-zm.jpg',
  'pg14-btn0': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/1/9/7/197594-zm.jpg',

  // === PAGE 15: Mandarin varieties ===
  'pg15-btn5': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/7/1/7/7174994-zm.jpg', // Afourer
  'pg15-btn4': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/8/2/2/8223825-zm.jpg', // Daisy
  'pg15-btn3': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/8/2/2/8223825-zm.jpg', // Empress
  'pg15-btn1': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/2/0/4/204893-zm.jpg',  // Honey Murcott
  'pg15-btn0': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/0/9/409750-zm.jpg',  // Imperial
  'pg15-btn2': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/8/2/2/8223825-zm.jpg', // Generic

  // === PAGE 16: Mango varieties ===
  'pg16-btn5': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/8/9/2/8925050-zm.jpg', // Calypso
  'pg16-btn4': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/5/2/4526847-zm.jpg', // Keitt
  'pg16-btn6': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/0/9/409772-zm.jpg',  // Large KP
  'pg16-btn3': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/0/9/409772-zm.jpg',  // Medium KP
  'pg16-btn2': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/5/2/4524932-zm.jpg', // Pearl
  'pg16-btn1': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/5/6/0/5604356-zm.jpg', // R2E2
  'pg16-btn0': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/0/9/409772-zm.jpg',  // Small KP

  // === PAGE 17: Melon varieties ===
  'pg17-btn1': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/5/9/4/5945620-zm.jpg', // Honeydew
  'pg17-btn6': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/4/2/4424610-zm.jpg', // Long Seeded (watermelon)
  'pg17-btn3': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/2/8/428915-zm.jpg',  // Outside (rockmelon)
  'pg17-btn0': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/2/8/428915-zm.jpg',  // Rockmelon
  'pg17-btn2': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/4/2/4424610-zm.jpg', // Round Seedless (watermelon)
  'pg17-btn5': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/5/9/4/5945620-zm.jpg', // Santa Claus

  // === PAGE 18: Nectarine varieties ===
  'pg18-btn1': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/5/5/9/5595663-zm.jpg', // White
  'pg18-btn0': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/0/9/409808-zm.jpg',  // Yellow

  // === PAGE 19: Orange varieties ===
  'pg19-btn2': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/5/9/6/5967167-zm.jpg', // Blood
  'pg19-btn3': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/5/9/6/5967167-zm.jpg', // Blood KG
  'pg19-btn4': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/9/5/9/9599134-zm.jpg', // Cara Cara
  'pg19-btn0': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/2/5/4255717-zm.jpg', // Navel
  'pg19-btn5': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/2/5/4255717-zm.jpg', // Bag
  'pg19-btn1': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/0/9/409830-zm.jpg',  // Valencia

  // === PAGE 20: Peach varieties ===
  'pg20-btn3': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/9/2/4/9241593-zm.jpg', // Donut
  'pg20-btn1': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/1/5/6/156713-zm.jpg',  // Golden Queen
  'pg20-btn4': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/1/5/6/156713-zm.jpg',  // Bucket
  'pg20-btn2': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/5/5/4552326-zm.jpg', // White
  'pg20-btn0': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/1/5/6/156713-zm.jpg',  // Yellow

  // === PAGE 21: Pear varieties ===
  'pg21-btn2': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/0/9/409987-zm.jpg',  // Bosc
  'pg21-btn1': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/3/9/8/398010-zm.jpg',  // Nashi
  'pg21-btn0': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/1/5/6/156258-zm.jpg',  // Packham
  'pg21-btn5': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/1/5/6/156258-zm.jpg',  // Bucket
  'pg21-btn4': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/0/9/409987-zm.jpg',  // Ruby Boo
  'pg21-btn3': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/0/9/409998-zm.jpg',  // Williams

  // === PAGE 22: Plum varieties ===
  'pg22-btn2': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/5/4/2/5424026-zm.jpg', // Black
  'pg22-btn3': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/7/4/3/7435690-zm.jpg', // Candy
  'pg22-btn4': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/1/5/6/156382-zm.jpg',  // Plums In
  'pg22-btn0': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/1/5/6/156382-zm.jpg',  // Red
  'pg22-btn1': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/7/4/3/7435690-zm.jpg', // Sugar

  // === PAGE 29: Lettuce varieties ===
  'pg29-btn1': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/6/4/4646485-zm.jpg', // Cos
  'pg29-btn2': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/5/9/4595952-zm.jpg', // Fancy
  'pg29-btn0': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/5/8/4584071-zm.jpg', // Iceberg

  // === PAGE 30: Mushroom varieties ===
  'pg30-btn0': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/8/2/4829420-zm.jpg', // Button
  'pg30-btn2': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/8/3/4835466-zm.jpg', // Flat
  'pg30-btn1': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/8/2/4829703-zm.jpg', // Swiss Brown

  // === PAGE 31: Onion varieties ===
  'pg31-btn0': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/8/0/4803991-zm.jpg', // 1KG Brown
  'pg31-btn1': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/8/0/4803991-zm.jpg', // Brown
  'pg31-btn2': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/2/1/4218459-zm.jpg', // Red
  'pg31-btn3': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/1/0/410443-zm.jpg',  // White
  'pg31-btn6': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/8/0/4803991-zm.jpg', // Pickling
  'pg31-btn4': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/2/1/4218459-zm.jpg', // Red Bag
  'pg31-btn5': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/0/8/408419-zm.jpg',  // Salad
  'pg31-btn7': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/0/8/408419-zm.jpg',  // Spring

  // === PAGE 32: Potato varieties ===
  'pg32-btn0': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/2/1/4217241-zm.jpg', // Brushed
  'pg32-btn2': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/2/1/4217241-zm.jpg', // Chats Bag
  'pg32-btn5': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/7/1/4/7141758-zm.jpg', // Dutch Cream
  'pg32-btn3': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/1/0/2/1022610-zm.jpg', // Kipfler
  'pg32-btn1': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/2/1/4217241-zm.jpg', // Washed

  // === PAGE 33: Pumpkin varieties ===
  'pg33-btn3': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/1/8/4183423-zm.jpg', // Butternut Cut
  'pg33-btn6': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/1/8/4183423-zm.jpg', // Butternut From
  'pg33-btn0': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/1/8/4183423-zm.jpg', // Butternut KG
  'pg33-btn4': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/1/8/4183558-zm.jpg', // Jap Cut
  'pg33-btn7': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/1/8/4183558-zm.jpg', // Jap From
  'pg33-btn1': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/1/8/4183558-zm.jpg', // Jap KG
  'pg33-btn5': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/2/0/4202540-zm.jpg', // Jarra Cut
  'pg33-btn8': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/2/0/4202540-zm.jpg', // Jarra From
  'pg33-btn2': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/2/0/4202540-zm.jpg', // Jarra KG

  // === PAGE 34: Sweet Potato varieties ===
  'pg34-btn0': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/1/9/4199503-zm.jpg', // Gold
  'pg34-btn1': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/3/6/1/3616751-zm.jpg', // Red
  'pg34-btn2': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/5/0/4/5045470-zm.jpg', // White

  // === PAGE 36: Zucchini ===
  'pg36-btn0': 'https://shop.coles.com.au/wcsstore/Coles-CAS/images/4/9/1/4910506-zm.jpg',
};

async function main() {
  const SQL = await initSqlJs();
  const dbPath = path.join(process.env.APPDATA, 'tillaroo', 'crisp-pos.sqlite');
  const db = new SQL.Database(fs.readFileSync(dbPath));

  const stmt = db.prepare("UPDATE keyboard_buttons SET image = ?1 WHERE id = ?2");
  let updated = 0;
  let missing = 0;

  for (const [id, url] of Object.entries(imageMap)) {
    const exists = db.exec("SELECT id FROM keyboard_buttons WHERE id = ?1", [id]);
    if (exists.length && exists[0].values.length) {
      stmt.run([url, id]);
      updated++;
    } else {
      console.log(`  MISSING button: ${id}`);
      missing++;
    }
  }
  stmt.free();

  console.log(`Updated ${updated} button images (${missing} missing)`);

  // Save both DBs
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  const bundledPath = path.join(__dirname, 'db', 'crisp-pos.sqlite');
  if (fs.existsSync(bundledPath)) {
    fs.writeFileSync(bundledPath, Buffer.from(data));
    console.log('Bundled DB also updated');
  }

  // Re-export keyboard-catpages.js (pages 2-5)
  const catBtns = db.exec('SELECT id, label, type, price, image, color, bg_color, parent_id, category_filter, alpha_range, sort_order, position, page, grid_row, grid_col, col_span, row_span, product_id, active FROM keyboard_buttons WHERE page IN (2,3,4,5) ORDER BY page, grid_row, grid_col');
  const catPages = [{page:2,name:'Fruit A-M',cols:13,rows:7},{page:3,name:'Fruit N-Z',cols:13,rows:7},{page:4,name:'Vegetables A-G',cols:13,rows:7},{page:5,name:'Vegetables H-Z',cols:13,rows:7}];
  const catArr = catBtns[0].values.map(r => ({id:r[0],label:r[1],type:r[2],price:r[3],image:r[4],color:r[5],bg_color:r[6],parent_id:r[7],category_filter:r[8],alpha_range:r[9],sort_order:r[10],position:r[11],page:r[12],grid_row:r[13],grid_col:r[14],col_span:r[15],row_span:r[16],product_id:r[17],active:r[18]}));

  const catOutput = `// Keyboard category pages (pages 2-5) — fruit/veg category navigation
// Auto-generated, do not edit manually
const VERSION = '2026-05-18-c'

const pages = ${JSON.stringify(catPages, null, 2)}

const buttons = ${JSON.stringify(catArr, null, 2)}

function apply(db) {
  const localVer = (() => { try { const r = db.exec("SELECT value FROM settings WHERE key = 'kb_catpages_ver'"); return r.length && r[0].values.length ? r[0].values[0][0] : '0' } catch (_) { return '0' } })()
  if (localVer >= VERSION) return 0

  db.run("DELETE FROM keyboard_buttons WHERE page IN (2,3,4,5)")
  db.run("DELETE FROM keyboard_pages WHERE page IN (2,3,4,5)")

  const pgStmt = db.prepare("INSERT OR REPLACE INTO keyboard_pages (page, name, cols, rows) VALUES (?,?,?,?)")
  for (const p of pages) { pgStmt.run([p.page, p.name, p.cols, p.rows]); }
  pgStmt.free()

  const btnStmt = db.prepare("INSERT OR REPLACE INTO keyboard_buttons (id, label, type, price, image, color, bg_color, parent_id, category_filter, alpha_range, sort_order, position, page, grid_row, grid_col, col_span, row_span, product_id, active) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
  for (const b of buttons) {
    btnStmt.run([b.id, b.label, b.type, b.price, b.image, b.color, b.bg_color, b.parent_id, b.category_filter, b.alpha_range, b.sort_order, b.position, b.page, b.grid_row, b.grid_col, b.col_span, b.row_span, b.product_id, b.active])
  }
  btnStmt.free()

  db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('kb_catpages_ver', ?)", [VERSION])
  return buttons.length
}

module.exports = { apply, VERSION }
`;
  fs.writeFileSync(path.join(__dirname, 'db', 'keyboard-catpages.js'), catOutput, 'utf-8');
  console.log('Re-exported db/keyboard-catpages.js (VERSION: 2026-05-18-c)');

  // Re-export keyboard-subpages.js (pages > 5)
  const subPages = db.exec("SELECT page, name, cols, rows FROM keyboard_pages WHERE page > 5 ORDER BY page");
  const subBtns = db.exec('SELECT id, label, type, price, image, color, bg_color, parent_id, category_filter, alpha_range, sort_order, position, page, grid_row, grid_col, col_span, row_span, product_id, active FROM keyboard_buttons WHERE page > 5 ORDER BY page, grid_row, grid_col');

  const spArr = subPages[0].values.map(r => ({page:r[0],name:r[1],cols:r[2],rows:r[3]}));
  const sbArr = subBtns[0].values.map(r => ({id:r[0],label:r[1],type:r[2],price:r[3],image:r[4],color:r[5],bg_color:r[6],parent_id:r[7],category_filter:r[8],alpha_range:r[9],sort_order:r[10],position:r[11],page:r[12],grid_row:r[13],grid_col:r[14],col_span:r[15],row_span:r[16],product_id:r[17],active:r[18]}));

  const subOutput = `// Keyboard sub-pages (pages 7-36) — extracted from Profit Track register photos
// Auto-generated, do not edit manually
const VERSION = '2026-05-18-c'

const pages = ${JSON.stringify(spArr, null, 2)}

const buttons = ${JSON.stringify(sbArr, null, 2)}

function apply(db) {
  const localVer = (() => { try { const r = db.exec("SELECT value FROM settings WHERE key = 'kb_subpages_ver'"); return r.length && r[0].values.length ? r[0].values[0][0] : '0' } catch (_) { return '0' } })()
  if (localVer >= VERSION) return 0

  db.run("DELETE FROM keyboard_buttons WHERE page > 5")
  db.run("DELETE FROM keyboard_pages WHERE page > 5")

  const pgStmt = db.prepare("INSERT OR REPLACE INTO keyboard_pages (page, name, cols, rows) VALUES (?,?,?,?)")
  for (const p of pages) { pgStmt.run([p.page, p.name, p.cols, p.rows]); }
  pgStmt.free()

  const btnStmt = db.prepare("INSERT OR REPLACE INTO keyboard_buttons (id, label, type, price, image, color, bg_color, parent_id, category_filter, alpha_range, sort_order, position, page, grid_row, grid_col, col_span, row_span, product_id, active) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
  for (const b of buttons) {
    btnStmt.run([b.id, b.label, b.type, b.price, b.image, b.color, b.bg_color, b.parent_id, b.category_filter, b.alpha_range, b.sort_order, b.position, b.page, b.grid_row, b.grid_col, b.col_span, b.row_span, b.product_id, b.active])
  }
  btnStmt.free()

  db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('kb_subpages_ver', ?)", [VERSION])
  return buttons.length
}

module.exports = { apply, VERSION }
`;
  fs.writeFileSync(path.join(__dirname, 'db', 'keyboard-subpages.js'), subOutput, 'utf-8');
  console.log('Re-exported db/keyboard-subpages.js (VERSION: 2026-05-18-c)');
}

main().catch(console.error);
