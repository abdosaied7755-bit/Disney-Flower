-- Disney Flowers & Gifts - safe demo catalog
with category_seed(slug,name,description,image_url,sort_order) as (
  values
    ('bouquets','بوكيهات الورد الطبيعي','تنسيقات طازة لكل لحظة','https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=900&q=84',10),
    ('red-roses','الورد الأحمر','رسالة حب لا تحتاج كلامًا','https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=900&q=84',20),
    ('pink-white-roses','الورد الوردي والأبيض','ألوان هادئة وذوق رقيق','https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=900&q=84',30),
    ('gift-boxes','بوكسات الورد والهدايا','هدية كاملة بتفاصيلها','https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=900&q=84',40),
    ('chocolate-sweets','الشوكولاتة والحلويات','لمسة حلوة تكمل الهدية','https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=900&q=84',50),
    ('teddy-gifts','الدُمى والهدايا اللطيفة','فرحة صغيرة تفضل في القلب','https://images.unsplash.com/photo-1559454403-b8fb88521f11?auto=format&fit=crop&w=900&q=84',60),
    ('birthday-gifts','هدايا أعياد الميلاد','مفاجآت تليق بيومه المميز','https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=900&q=84',70),
    ('anniversary','هدايا المناسبات والذكرى السنوية','لذكرى تستحق الاحتفال','https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=84',80),
    ('gift-cards','بطاقات الإهداء','اكتب إحساسك بطريقتك','https://images.unsplash.com/photo-1513883049090-d0b7439799bf?auto=format&fit=crop&w=900&q=84',90),
    ('custom-gifts','هدايا مخصصة حسب الطلب','نصممها على ذوقك','https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=900&q=84',100)
)
insert into public.categories(slug,name,description,image_url,sort_order,is_active)
select slug,name,description,image_url,sort_order,true from category_seed
on conflict (slug) do update set name=excluded.name, description=excluded.description, image_url=excluded.image_url, sort_order=excluded.sort_order, is_active=true;

with product_seed(category_slug,name,description,unit,price,old_price,image_url,product_type,occasion,stock_quantity,is_special_offer,is_featured) as (
  values
    ('bouquets','بوكيه ورد أحمر كلاسيك','بوكيه ورد طبيعي بتغليف Disney الأنيق','باقة',450,520,'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=900&q=84','ورد طبيعي','رومانسي',12,true,true),
    ('bouquets','بوكيه ورد وردي ناعم','ألوان وردية هادئة ولمسة رقيقة','باقة',390,null,'https://images.unsplash.com/photo-1513883049090-d0b7439799bf?auto=format&fit=crop&w=900&q=84','ورد طبيعي','مناسبة خاصة',10,false,true),
    ('red-roses','12 وردة حمراء بتغليف فاخر','ورد أحمر مختار بعناية','12 وردة',650,null,'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=900&q=84','ورد طبيعي','رومانسي',8,false,true),
    ('pink-white-roses','بوكيه وردي وأبيض','تنسيق ناعم يناسب كل المناسبات','باقة',550,null,'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=900&q=84','ورد طبيعي','تهنئة',9,false,false),
    ('gift-boxes','بوكس حب بالورد والشوكولاتة','هدية متكاملة برسالة من القلب','بوكس',850,980,'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=900&q=84','بوكس هدايا','رومانسي',6,true,true),
    ('chocolate-sweets','علبة شوكولاتة فاخرة','اختيار لذيذ يضيف للهدية','علبة',420,null,'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=900&q=84','شوكولاتة','كل المناسبات',15,false,false),
    ('teddy-gifts','دبدوب مع بوكيه ورد','هدية لطيفة للمفاجآت الجميلة','قطعة',720,null,'https://images.unsplash.com/photo-1559454403-b8fb88521f11?auto=format&fit=crop&w=900&q=84','دمى وهدايا','عيد ميلاد',5,false,true),
    ('birthday-gifts','تنسيق عيد ميلاد بالورد','بالونات وورد لتكتمل المفاجأة','تنسيق',780,null,'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=900&q=84','هدايا مناسبات','عيد ميلاد',7,false,false),
    ('anniversary','تنسيق ذكرى سنوية فاخر','تفاصيل رومانسية لذكرى لا تنسى','تنسيق',980,null,'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=84','ورد وهدايا','ذكرى سنوية',4,false,true),
    ('gift-cards','بطاقة إهداء رومانسية','اكتب رسالتك بخطك الخاص','بطاقة',65,null,'https://images.unsplash.com/photo-1513883049090-d0b7439799bf?auto=format&fit=crop&w=900&q=84','بطاقات','كل المناسبات',30,false,false),
    ('custom-gifts','هدية مخصصة حسب الطلب','نصممها باسم ورسالة من اختيارك','طلب خاص',700,null,'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=900&q=84','هدايا مخصصة','كل المناسبات',3,false,true)
)
insert into public.products(category_id,name,description,unit,price,old_price,image_url,product_type,occasion,stock_quantity,is_special_offer,is_featured,is_active)
select c.id,p.name,p.description,p.unit,p.price,p.old_price,p.image_url,p.product_type,p.occasion,p.stock_quantity,p.is_special_offer,p.is_featured,true
from product_seed p join public.categories c on c.slug=p.category_slug
on conflict (category_id,name) do update set description=excluded.description, unit=excluded.unit, price=excluded.price, old_price=excluded.old_price, image_url=excluded.image_url, product_type=excluded.product_type, occasion=excluded.occasion, stock_quantity=excluded.stock_quantity, is_special_offer=excluded.is_special_offer, is_featured=excluded.is_featured, is_active=true;
