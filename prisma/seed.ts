/**
 * Seeds DELLA with its starting configuration.
 * Demo products are flagged `isDemo` + `priceVerified: false`, and inventory is UNVERIFIED —
 * the storefront labels them as such until an admin verifies details with the retail partner.
 * Delivery zones/fees are sample values for the admin to review; most localities start disabled.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_ROLES } from "../src/lib/rbac";

const db = new PrismaClient();
const ILS = (n: number) => Math.round(n * 100);
const TBV = { labelAr: "", labelEn: "", valueAr: "قيد التحقق", valueEn: "To be verified" };

async function main() {
  // ── Roles & initial Super Admin ──
  for (const r of DEFAULT_ROLES) {
    await db.adminRole.upsert({
      where: { key: r.key },
      create: { ...r, system: true },
      update: { nameAr: r.nameAr, nameEn: r.nameEn },
    });
  }
  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    if (password.length < 12) throw new Error("ADMIN_PASSWORD must be at least 12 characters");
    const role = await db.adminRole.findUniqueOrThrow({ where: { key: "SUPER_ADMIN" } });
    await db.adminUser.upsert({
      where: { email },
      create: { email, name: "DELLA Admin", passwordHash: await bcrypt.hash(password, 12), roleId: role.id },
      update: {},
    });
    console.log(`Super Admin ready: ${email}`);
  } else console.warn("ADMIN_EMAIL / ADMIN_PASSWORD not set — run `npm run admin:create` later.");

  // ── Retail partner (details to be completed by admin) ──
  let partner = await db.partner.findFirst();
  if (!partner) {
    partner = await db.partner.create({
      data: {
        name: "الشريك التجاري — Retail Partner",
        notes: "Complete the partner's legal name, contacts and the agreed commission terms.",
        commissionType: "PERCENT",
        commissionValue: 1000,
      },
    });
  }

  // ── Categories ──
  const cats = [
    { slug: "hair-styling", nameAr: "أجهزة تصفيف الشعر", nameEn: "Hair Styling Devices", image: "/brand/illustrations/styler.svg",
      descAr: "أدوات تصفيف أنيقة لإطلالة صالون في البيت.", descEn: "Elegant styling tools for a salon finish at home." },
    { slug: "curly-hair", nameAr: "أجهزة الشعر المجعّد", nameEn: "Curly Hair Devices", image: "/brand/illustrations/diffuser.svg",
      descAr: "عناية لطيفة تحافظ على تموّجات شعرك.", descEn: "Gentle care that keeps your curls defined." },
    { slug: "hair-removal-beauty-tech", nameAr: "إزالة الشعر وتقنيات الجمال", nameEn: "Hair Removal & Beauty Tech", image: "/brand/illustrations/ipl.svg",
      descAr: "تقنيات جمال ذكية لروتين أسهل.", descEn: "Smart beauty tech for an easier routine." },
    { slug: "nail-care", nameAr: "أجهزة العناية بالأظافر", nameEn: "Nail Care Devices", image: "/brand/illustrations/nail-lamp.svg",
      descAr: "مانيكير احترافي بلمسة منزلية.", descEn: "A professional manicure, at home." },
    { slug: "cute-tech", nameAr: "تقنيات لطيفة وأسلوب حياة", nameEn: "Cute Tech & Lifestyle", image: "/brand/illustrations/printer.svg",
      descAr: "أدوات صغيرة تُضفي البهجة على يومك.", descEn: "Little gadgets that brighten your day." },
  ];
  const catIds: Record<string, string> = {};
  for (const [i, c] of cats.entries()) {
    const row = await db.category.upsert({ where: { slug: c.slug }, create: { ...c, sortOrder: i }, update: {} });
    catIds[c.slug] = row.id;
  }

  // ── Demo products ──
  const products = [
    {
      slug: "5-in-1-hair-styler", sku: "DL-DEMO-STY5", cat: "hair-styling", price: 349, compareAt: null as number | null,
      nameAr: "جهاز تصفيف الشعر 5 في 1", nameEn: "5-in-1 Hair Styling Device",
      shortAr: "جهاز واحد بخمس قطع لتجعيد وتمويج وتنعيم الشعر.", shortEn: "One device, five attachments to curl, wave and smooth.",
      descAr: "جهاز متعدد الاستخدامات يجمع أدوات تصفيف مختلفة في قطعة واحدة أنيقة. التفاصيل الفنية والسعر النهائي قيد التحقق مع الشريك التجاري.",
      descEn: "A versatile styler that brings several styling tools together in one elegant piece. Technical details and final price are being verified with our retail partner.",
      featuresAr: ["خمس قطع قابلة للتبديل", "مناسب للاستخدام اليومي", "حقيبة تخزين (قيد التحقق)"],
      featuresEn: ["Five interchangeable attachments", "Designed for everyday styling", "Storage case (to be verified)"],
      image: "/brand/illustrations/styler.svg", featured: true, newArrival: true,
      variants: [{ nameAr: "وردي", nameEn: "Blush", colorHex: "#F5D6E4" }, { nameAr: "برقوقي", nameEn: "Plum", colorHex: "#241A26" }],
    },
    {
      slug: "curly-hair-diffuser-dryer", sku: "DL-DEMO-DIFF", cat: "curly-hair", price: 279, compareAt: null,
      nameAr: "مجفف شعر مع ناشر للشعر المجعّد", nameEn: "Curly Hair Diffuser Dryer",
      shortAr: "تجفيف لطيف يحافظ على شكل التجعيدات.", shortEn: "Gentle drying that keeps curls defined.",
      descAr: "مجفف شعر مع ملحق ناشر (Diffuser) مصمم لتوزيع الهواء بلطف على الشعر المجعّد. المواصفات قيد التحقق.",
      descEn: "A hair dryer with a diffuser attachment designed to spread airflow gently over curly hair. Specifications are being verified.",
      featuresAr: ["ملحق ناشر للتجعيدات", "إعدادات حرارة متعددة (قيد التحقق)", "مقبض مريح"],
      featuresEn: ["Diffuser attachment for curls", "Multiple heat settings (to be verified)", "Comfortable grip"],
      image: "/brand/illustrations/diffuser.svg", featured: true, newArrival: false, variants: [],
    },
    {
      slug: "ipl-hair-removal-device", sku: "DL-DEMO-IPL", cat: "hair-removal-beauty-tech", price: 599, compareAt: null,
      nameAr: "جهاز إزالة الشعر IPL", nameEn: "IPL Hair Removal Device",
      shortAr: "تقنية الضوء النبضي للاستخدام المنزلي.", shortEn: "Intense pulsed light technology for home use.",
      descAr: "جهاز IPL للاستخدام المنزلي. يُرجى قراءة إرشادات السلامة ونوع البشرة المناسب قبل الاستخدام. التفاصيل والضمان قيد التحقق.",
      descEn: "An at-home IPL device. Please read the safety guidance and suitable skin tones before use. Details and warranty are being verified.",
      featuresAr: ["للاستخدام المنزلي", "مستويات طاقة متعددة (قيد التحقق)", "يتطلب اختبار حساسية قبل الاستخدام"],
      featuresEn: ["For home use", "Multiple energy levels (to be verified)", "Patch test required before use"],
      image: "/brand/illustrations/ipl.svg", featured: true, newArrival: true, variants: [],
    },
    {
      slug: "uv-led-nail-lamp", sku: "DL-DEMO-NAIL", cat: "nail-care", price: 129, compareAt: null,
      nameAr: "لمبة أظافر UV/LED", nameEn: "UV/LED Nail Lamp",
      shortAr: "تجفيف جل الأظافر في البيت.", shortEn: "Cure gel polish at home.",
      descAr: "لمبة UV/LED لتجفيف طلاء الجل. القدرة ومؤقتات التشغيل قيد التحقق.",
      descEn: "A UV/LED lamp for curing gel polish. Wattage and timer settings are being verified.",
      featuresAr: ["مؤقت تشغيل", "تصميم مدمج", "مناسب لليدين والقدمين (قيد التحقق)"],
      featuresEn: ["Built-in timer", "Compact design", "Hands and feet (to be verified)"],
      image: "/brand/illustrations/nail-lamp.svg", featured: false, newArrival: true,
      variants: [{ nameAr: "أبيض", nameEn: "White", colorHex: "#FFFFFF" }, { nameAr: "وردي", nameEn: "Pink", colorHex: "#EDBFD3" }],
    },
    {
      slug: "mini-portable-printer", sku: "DL-DEMO-PRNT", cat: "cute-tech", price: 189, compareAt: null,
      nameAr: "طابعة صغيرة محمولة", nameEn: "Mini Portable Printer",
      shortAr: "اطبعي صورك وملاحظاتك من الجوال.", shortEn: "Print photos and notes from your phone.",
      descAr: "طابعة جيب لطيفة للصور والملصقات والملاحظات. التوافق مع الأجهزة ونوع الورق قيد التحقق.",
      descEn: "A charming pocket printer for photos, stickers and notes. Device compatibility and paper type are being verified.",
      featuresAr: ["اتصال لاسلكي (قيد التحقق)", "حجم الجيب", "مثالية لدفاتر الذكريات"],
      featuresEn: ["Wireless connection (to be verified)", "Pocket-sized", "Perfect for journaling"],
      image: "/brand/illustrations/printer.svg", featured: true, newArrival: false,
      variants: [{ nameAr: "وردي", nameEn: "Pink", colorHex: "#EDBFD3" }, { nameAr: "أبيض", nameEn: "White", colorHex: "#FFFFFF" }],
    },
  ];

  for (const p of products) {
    if (await db.product.findUnique({ where: { slug: p.slug } })) continue;
    const variants = p.variants.length
      ? p.variants.map((v, i) => ({ ...v, sku: `${p.sku}-${v.nameEn.toUpperCase()}`, isDefault: i === 0, sortOrder: i }))
      : [{ nameAr: "افتراضي", nameEn: "Default", colorHex: null, sku: `${p.sku}-STD`, isDefault: true, sortOrder: 0 }];
    await db.product.create({
      data: {
        slug: p.slug, sku: p.sku, nameAr: p.nameAr, nameEn: p.nameEn, shortAr: p.shortAr, shortEn: p.shortEn,
        descAr: p.descAr, descEn: p.descEn, featuresAr: p.featuresAr, featuresEn: p.featuresEn,
        specs: [
          { ...TBV, labelAr: "العلامة التجارية", labelEn: "Brand" },
          { ...TBV, labelAr: "الموديل", labelEn: "Model" },
          { ...TBV, labelAr: "القدرة / الجهد", labelEn: "Power / Voltage" },
          { ...TBV, labelAr: "محتويات العلبة", labelEn: "In the box" },
        ],
        price: ILS(p.price), compareAtPrice: p.compareAt ? ILS(p.compareAt) : null,
        priceVerified: false, isDemo: true, status: "PUBLISHED",
        categoryId: catIds[p.cat], partnerId: partner.id,
        featured: p.featured, newArrival: p.newArrival,
        warrantyAr: "الضمان يقدّمه الشريك التجاري وفق شروط الشركة المصنّعة — المدة قيد التحقق.",
        warrantyEn: "Warranty is provided by our retail partner under manufacturer terms — duration to be verified.",
        images: { create: [{ url: p.image, altAr: `رسم توضيحي — ${p.nameAr}`, altEn: `Illustration — ${p.nameEn}`, sortOrder: 0 }] },
        variants: { create: variants.map((v) => ({ ...v, inventory: { create: { availability: "UNVERIFIED" } } })) },
      },
    });
  }

  // ── Delivery: governorates, localities, zones (sample values — review in admin) ──
  if ((await db.governorate.count()) === 0) {
    const zone = async (nameAr: string, nameEn: string, fee: number, free: number | null, min: number, max: number, active: boolean, sortOrder: number) =>
      (await db.deliveryZone.create({ data: { nameAr, nameEn, fee: ILS(fee), freeShippingMin: free ? ILS(free) : null, etaMinDays: min, etaMaxDays: max, active, sortOrder } })).id;
    const zCentral = await zone("وسط الضفة", "Central West Bank", 20, 300, 1, 2, true, 0);
    const zNorth = await zone("شمال الضفة", "Northern West Bank", 25, 350, 2, 3, true, 1);
    const zSouth = await zone("جنوب الضفة", "Southern West Bank", 25, 350, 2, 3, true, 2);
    const zJerusalem = await zone("القدس", "Jerusalem", 35, null, 2, 4, false, 3);
    const zGaza = await zone("قطاع غزة", "Gaza Strip", 0, null, 0, 0, false, 4);

    const govs: [string, string, string, [string, string, boolean][]][] = [
      ["رام الله والبيرة", "Ramallah & Al-Bireh", zCentral, [["رام الله", "Ramallah", true], ["البيرة", "Al-Bireh", true], ["بيرزيت", "Birzeit", true], ["بيتونيا", "Beitunia", true], ["سلواد", "Silwad", false]]],
      ["القدس", "Jerusalem", zJerusalem, [["القدس", "Jerusalem", false], ["العيزرية", "Al-Eizariya", false], ["أبو ديس", "Abu Dis", false]]],
      ["بيت لحم", "Bethlehem", zSouth, [["بيت لحم", "Bethlehem", true], ["بيت جالا", "Beit Jala", true], ["بيت ساحور", "Beit Sahour", true]]],
      ["الخليل", "Hebron", zSouth, [["الخليل", "Hebron", true], ["دورا", "Dura", false], ["حلحول", "Halhul", false], ["يطا", "Yatta", false]]],
      ["نابلس", "Nablus", zNorth, [["نابلس", "Nablus", true], ["حوارة", "Huwara", false], ["بيتا", "Beita", false]]],
      ["جنين", "Jenin", zNorth, [["جنين", "Jenin", true], ["قباطية", "Qabatiya", false], ["يعبد", "Ya'bad", false]]],
      ["طولكرم", "Tulkarm", zNorth, [["طولكرم", "Tulkarm", true], ["عنبتا", "Anabta", false]]],
      ["قلقيلية", "Qalqilya", zNorth, [["قلقيلية", "Qalqilya", true], ["عزون", "Azzun", false]]],
      ["سلفيت", "Salfit", zCentral, [["سلفيت", "Salfit", false], ["بديا", "Bidya", false]]],
      ["طوباس", "Tubas", zNorth, [["طوباس", "Tubas", false], ["طمون", "Tammun", false]]],
      ["أريحا والأغوار", "Jericho & Al-Aghwar", zCentral, [["أريحا", "Jericho", false]]],
      ["شمال غزة", "North Gaza", zGaza, [["جباليا", "Jabalia", false], ["بيت لاهيا", "Beit Lahia", false]]],
      ["غزة", "Gaza", zGaza, [["غزة", "Gaza City", false]]],
      ["دير البلح", "Deir al-Balah", zGaza, [["دير البلح", "Deir al-Balah", false]]],
      ["خانيونس", "Khan Yunis", zGaza, [["خانيونس", "Khan Yunis", false]]],
      ["رفح", "Rafah", zGaza, [["رفح", "Rafah", false]]],
    ];
    for (const [i, [ar, en, zoneId, locs]] of govs.entries()) {
      await db.governorate.create({
        data: {
          nameAr: ar, nameEn: en, sortOrder: i,
          localities: { create: locs.map(([lar, len, active]) => ({ nameAr: lar, nameEn: len, zoneId, active })) },
        },
      });
    }
  }
  if ((await db.courier.count()) === 0) await db.courier.create({ data: { name: "Partner courier" } });

  // ── Sample coupon ──
  await db.coupon.upsert({
    where: { code: "WELCOME10" },
    create: { code: "WELCOME10", type: "PERCENT", value: 10, minOrder: ILS(100), perCustomerLimit: 1, productIds: [], categoryIds: [] },
    update: {},
  });

  // ── Settings ──
  const settings: Record<string, object> = {
    announcement: { enabled: true, textAr: "توصيل داخل مناطق مختارة في الضفة · الدفع عند الاستلام", textEn: "Delivery to selected West Bank areas · Cash on delivery", link: "/pages/delivery" },
    footer: {
      aboutAr: "ديلا متجر فلسطيني لأجهزة الجمال والتقنيات اللطيفة، نختارها بعناية لكِ.",
      aboutEn: "DELLA is a Palestinian boutique for beauty tech and lifestyle gadgets, curated with care for you.",
    },
    seo: {
      titleAr: "ديلا — أجهزة صُنعت لكِ", titleEn: "DELLA — Gadgets Made for Her",
      descAr: "متجر ديلا لأجهزة تصفيف الشعر، تقنيات الجمال، العناية بالأظافر والتقنيات اللطيفة في فلسطين.",
      descEn: "DELLA: hair styling devices, beauty tech, nail care and lifestyle gadgets in Palestine.",
    },
  };
  for (const [key, value] of Object.entries(settings)) {
    await db.storeSetting.upsert({ where: { key }, create: { key, value }, update: {} });
  }

  // ── Homepage sections ──
  if ((await db.homepageSection.count()) === 0) {
    const s = (type: string, titleAr: string | null, titleEn: string | null, config: object = {}, extra: object = {}) => ({ type, titleAr, titleEn, config, ...extra });
    const sections = [
      s("HERO", "تكنولوجيا على ذوقك.", "Technology, Beautifully Yours.", {
        eyebrowAr: "المجموعة رقم ٠١", eyebrowEn: "Collection N°01",
        bodyAr: "أجهزة جمال وتقنيات لطيفة، نختارها بعناية لتناسب روتينك وأسلوبك.",
        bodyEn: "Beauty devices and lifestyle tech, thoughtfully curated for your routine and your style.",
        primaryLabelAr: "تسوقي الآن", primaryLabelEn: "Shop now", primaryHref: "/shop",
        secondaryLabelAr: "اكتشفي المجموعة", secondaryLabelEn: "Discover the collection", secondaryHref: "/shop?sort=new",
        image: "/brand/illustrations/styler.svg", productSlug: "5-in-1-hair-styler",
      }),
      s("CATEGORIES", "تسوّقي حسب الفئة", "Shop by category"),
      s("COLLECTIONS", "مجموعات مختارة", "Curated collections", {
        items: [
          { titleAr: "روتين الشعر", titleEn: "The Hair Ritual", href: "/shop?category=hair-styling", image: "/brand/illustrations/styler.svg" },
          { titleAr: "جمال ذكي", titleEn: "Smart Beauty", href: "/shop?category=hair-removal-beauty-tech", image: "/brand/illustrations/ipl.svg" },
          { titleAr: "لمسات لطيفة", titleEn: "Little Joys", href: "/shop?category=cute-tech", image: "/brand/illustrations/printer.svg" },
        ],
      }),
      s("FEATURED", "مختارات ديلا", "DELLA Edit", { limit: 4 }),
      s("SPOTLIGHT", "تقنيات الجمال", "Beauty Tech Spotlight", {
        productSlug: "ipl-hair-removal-device",
        bodyAr: "تقنيات كانت حكراً على الصالونات، صارت بين يديكِ. نشرح لكِ كل جهاز بوضوح قبل أن تختاري.",
        bodyEn: "Technology once reserved for salons, now in your hands. We explain every device clearly before you choose.",
      }),
      s("BEST_SELLERS", "الأكثر طلباً", "Best sellers", { limit: 4 }),
      s("STORY", "صُنعت لكِ", "Made for Her", {
        bodyAr: "بدأت ديلا من فكرة بسيطة: أن تجد كل امرأة في فلسطين أجهزتها المفضلة في مكان واحد أنيق وموثوق، مع ضمان حقيقي وتوصيل حتى باب البيت.",
        bodyEn: "DELLA began with a simple idea: every woman in Palestine should find the gadgets she loves in one elegant, trustworthy place — with genuine warranty and delivery to her door.",
        image: "/brand/illustrations/nail-lamp.svg",
      }),
      s("NEW_ARRIVALS", "وصل حديثاً", "New arrivals", { limit: 4 }),
      s("LIFESTYLE", "تقنيات لطيفة", "Lifestyle gadgets", { categorySlug: "cute-tech", limit: 4 }),
      s("OFFERS", "عرض الترحيب", "Welcome offer", {
        bodyAr: "خصم ١٠٪ على طلبك الأول فوق ١٠٠ ₪ مع الكود", bodyEn: "10% off your first order over ₪100 with code",
        code: "WELCOME10", href: "/shop",
      }, { visible: true }),
      s("WHY", "لماذا ديلا؟", "Why DELLA?", {
        items: [
          { icon: "shield", titleAr: "منتجات أصلية بضمان", titleEn: "Genuine, with warranty", bodyAr: "نتعامل مع شريك تجاري معتمد، والضمان واضح لكل منتج.", bodyEn: "We work with an established retail partner and every warranty is stated clearly." },
          { icon: "truck", titleAr: "توصيل لباب البيت", titleEn: "Delivered to your door", bodyAr: "رسوم وتوقيت التوصيل واضحة قبل إتمام الطلب.", bodyEn: "Delivery fees and timing are shown before you order." },
          { icon: "cash", titleAr: "ادفعي عند الاستلام", titleEn: "Pay on delivery", bodyAr: "اطلبي بثقة وادفعي عند وصول طلبك.", bodyEn: "Order with confidence and pay when it arrives." },
          { icon: "chat", titleAr: "نصيحة صادقة", titleEn: "Honest advice", bodyAr: "فريقنا يساعدك تختاري الجهاز المناسب لكِ.", bodyEn: "Our team helps you choose the right device." },
        ],
      }),
      s("REVIEWS", "آراء العميلات", "Customer reviews"),
      s("NEWSLETTER", "انضمي لعالم ديلا", "Join the DELLA world", { bodyAr: "إطلاقات جديدة وعروض خاصة — بدون إزعاج.", bodyEn: "New launches and private offers — never spam." }),
      s("SOCIAL", "تابعينا", "Follow us"),
    ];
    for (const [i, sec] of sections.entries()) await db.homepageSection.create({ data: { ...sec, sortOrder: i } });
  }

  // ── Content pages ──
  const pages = [
    ["about", "عن ديلا", "About DELLA",
      "ديلا علامة فلسطينية تقدّم أجهزة الجمال وتقنيات أسلوب الحياة للمرأة، بالشراكة مع متجر إلكترونيات معتمد يتولى المخزون والضمان والتوصيل.\n\nنؤمن أن التقنية يمكن أن تكون جميلة، وأن تجربة التسوق يجب أن تكون واضحة وموثوقة.",
      "DELLA is a Palestinian brand bringing beauty devices and lifestyle tech to women, in partnership with an established electronics retailer who handles inventory, warranty and delivery.\n\nWe believe technology can be beautiful, and shopping should be clear and trustworthy."],
    ["delivery", "التوصيل", "Delivery",
      "نوصل حالياً إلى مناطق مختارة. تظهر رسوم التوصيل والمدة المتوقعة عند اختيار مدينتك في صفحة الدفع.\n\n(يُرجى من الإدارة مراجعة هذه السياسة قبل الإطلاق.)",
      "We currently deliver to selected areas. Delivery fees and estimated times appear when you choose your city at checkout.\n\n(Admin: please review this policy before launch.)"],
    ["returns", "الاسترجاع والاستبدال", "Returns & exchanges",
      "تختلف أهلية الاسترجاع حسب المنتج وحالته. تواصلي معنا قبل إرجاع أي منتج.\n\n(يُرجى من الإدارة تحديد سياسة الاسترجاع النهائية بالتنسيق مع الشريك التجاري.)",
      "Return eligibility depends on the product and its condition. Contact us before returning an item.\n\n(Admin: please set the final return policy with the retail partner.)"],
    ["warranty", "الضمان", "Warranty",
      "يقدّم الشريك التجاري الضمان وفق شروط الشركة المصنّعة. تظهر تفاصيل الضمان في صفحة كل منتج.",
      "Warranty is provided by our retail partner under the manufacturer's terms. Warranty details are shown on each product page."],
    ["privacy", "سياسة الخصوصية", "Privacy policy",
      "نستخدم بياناتك فقط لمعالجة طلباتك والتواصل معك بخصوصها. لا نبيع بياناتك. يمكنك طلب حذف حسابك من صفحة الحساب.\n\n(مسودة — يُرجى مراجعتها قانونياً.)",
      "We use your data only to process and communicate about your orders. We never sell your data. You can request account deletion from your account page.\n\n(Draft — please have it reviewed legally.)"],
    ["terms", "الشروط والأحكام", "Terms & conditions",
      "مسودة شروط الاستخدام — يُرجى مراجعتها قانونياً قبل الإطلاق.",
      "Draft terms of use — please have them reviewed legally before launch."],
  ];
  for (const [slug, titleAr, titleEn, bodyAr, bodyEn] of pages) {
    await db.contentPage.upsert({ where: { slug }, create: { slug, titleAr, titleEn, bodyAr, bodyEn }, update: {} });
  }
  console.log("Seed complete.");
}

main().finally(() => db.$disconnect());
