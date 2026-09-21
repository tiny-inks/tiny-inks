'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck, Zap, Ruler, Wrench, Bike, Truck, Gift, Sparkles,
  ChevronDown, Check, MessageCircle, ArrowRight, Feather,
} from 'lucide-react';
import Reveal from '@/components/Reveal';
import { useCart } from '@/components/CartContext';
import { formatPrice } from '@/lib/products';

/* Whimsy Wheels — a bespoke, animated landing for the kids-bike line.
   Pure presentation over the existing catalogue: it reads the real Shopify
   "Whimsy Wheels" products (price, image, stock, variant) and adds to the same
   cart as everything else. No checkout/pricing logic lives here. */

const COLOR_HEX = { Blue: '#4c7fd6', Green: '#7cc089', Orange: '#ef8a4c', Red: '#e05b52', Pink: '#e58aa8', Yellow: '#f3c33f', Black: '#333333', White: '#e8e8e8' };
const AGE = { 12: '2–4', 14: '4–6', 16: '5–8', 20: '7+' };
const HEIGHT = { 12: '85–105', 14: '95–115', 16: '105–125', 20: '120–140' };

const T = {
  en: {
    eyebrow: 'Whimsy Wheels',
    h1: 'Their first ride,',
    h1b: 'made joyful.',
    sub: 'Steel & aluminium kids’ bikes built for real little adventurers — child-friendly geometry, safe braking, and assembly in about 2 minutes.',
    ctaBuild: 'Build their bike', ctaSizes: 'Find the size',
    scrollHint: 'Scroll to explore',
    badges: [
      { Icon: Zap, t: 'Assembles in ~2 min' },
      { Icon: ShieldCheck, t: 'Kid-safe braking' },
      { Icon: Gift, t: 'Free gift wrap' },
      { Icon: Truck, t: 'UAE delivery' },
    ],
    buildTitle: 'Build their bike', buildLede: 'Pick a range, a size, and a colour — the price and bike update live.',
    model: 'Range', size: 'Size', colour: 'Colour', fits: 'Fits ages', wheels: 'wheels',
    add: 'Add to cart', added: 'Added ✓', soldout: 'Sold out', details: 'View full details',
    wrapNote: 'Free gift wrap · UAE delivery · easy returns',
    featTitle: 'Why kids (and parents) love them',
    features: [
      { Icon: ShieldCheck, t: 'Durable frame', d: 'Sturdy steel or light aluminium — stable, safe and built to last through every wobble and win.' },
      { Icon: Bike, t: 'Child-friendly geometry', d: 'Age-specific angles give a natural, upright posture so learning to ride feels easy.' },
      { Icon: Feather, t: 'Safe, easy braking', d: 'Ergonomic levers and grips sized for small hands — a smooth, confident stop every time.' },
      { Icon: Ruler, t: 'Ergonomic saddle & pedals', d: 'Crank length and pedal spacing tuned to little legs for effortless, comfy pedalling.' },
      { Icon: Wrench, t: '2-minute assembly', d: 'Patented tech and one tool — handlebar, pedals and quick-release sidewheels on in minutes.' },
    ],
    sizeTitle: 'Find the right size', sizeLede: 'A quick guide by age and height (cm). When in doubt, size up — kids grow fast.',
    ageCol: 'Age', heightCol: 'Height', wheelCol: 'Wheel',
    rangeTitle: 'Two ranges',
    classicName: 'Classic', classicDesc: 'Durable steel frame with quick-release sidewheels. The confident all-rounder for first riders.',
    proName: 'Pro Aluminum', proDesc: 'Lighter aluminium frame for older, faster kids who are ready to fly. Easier to lift, easier to ride.',
    from: 'from',
    lineupTitle: 'The whole line-up', lineupLede: 'Every size and colour, ready to ship.',
    specTitle: 'Good to know',
    specs: [
      { k: 'Assembly', v: 'About 2 minutes, one tool included' },
      { k: 'Sidewheels', v: 'Quick-release stabilisers (Classic)' },
      { k: 'Frame', v: 'Steel (Classic) · Aluminium (Pro)' },
      { k: 'Sizes', v: '12″, 14″, 16″, 20″' },
    ],
    helpTitle: 'Not sure which one?', helpLede: 'Tell us your child’s age and height — we’ll pick the perfect bike with you.',
    whatsapp: 'Ask us on WhatsApp', backToShop: 'Browse the whole shop',
    waMsg: 'Hi Tiny Inks! I’d like help choosing a Whimsy Wheels kids bike.',
    empty: 'Our bikes are rolling in soon — check back shortly!',
  },
  ar: {
    eyebrow: 'ويمزي ويلز',
    h1: 'أول رحلة لهم،',
    h1b: 'بكل فرح.',
    sub: 'دراجات أطفال من الفولاذ والألمنيوم لمغامرين صغار حقيقيين — تصميم مناسب للأطفال، فرامل آمنة، وتركيب خلال دقيقتين تقريبًا.',
    ctaBuild: 'اختر الدراجة', ctaSizes: 'اعرف المقاس',
    scrollHint: 'مرّر للأسفل',
    badges: [
      { Icon: Zap, t: 'تركيب خلال دقيقتين' },
      { Icon: ShieldCheck, t: 'فرامل آمنة للأطفال' },
      { Icon: Gift, t: 'تغليف هدية مجاني' },
      { Icon: Truck, t: 'توصيل داخل الإمارات' },
    ],
    buildTitle: 'اختر دراجتهم', buildLede: 'اختر الفئة والمقاس واللون — يتحدث السعر والدراجة مباشرة.',
    model: 'الفئة', size: 'المقاس', colour: 'اللون', fits: 'مناسبة لعمر', wheels: 'بوصة',
    add: 'أضِف إلى السلة', added: 'أُضيفت ✓', soldout: 'نفدت الكمية', details: 'كل التفاصيل',
    wrapNote: 'تغليف مجاني · توصيل داخل الإمارات · إرجاع سهل',
    featTitle: 'لماذا يحبها الأطفال (والآباء)',
    features: [
      { Icon: ShieldCheck, t: 'هيكل متين', d: 'فولاذ قوي أو ألمنيوم خفيف — ثبات وأمان وصلابة تدوم مع كل محاولة ونجاح.' },
      { Icon: Bike, t: 'تصميم مناسب للأطفال', d: 'زوايا مدروسة حسب العمر تمنح وضعية طبيعية ومريحة تجعل تعلّم القيادة سهلًا.' },
      { Icon: Feather, t: 'فرملة آمنة وسهلة', d: 'مقابض وروافع بحجم الأيدي الصغيرة — توقف سلس وواثق في كل مرة.' },
      { Icon: Ruler, t: 'مقعد ودواسات مريحة', d: 'طول ذراع الدواسة والمسافات مُهيّأة للأرجل الصغيرة لدفعٍ مريح بلا جهد.' },
      { Icon: Wrench, t: 'تركيب بدقيقتين', d: 'تقنية مسجّلة وأداة واحدة — المقود والدواسات والعجلات الجانبية في دقائق.' },
    ],
    sizeTitle: 'اختر المقاس المناسب', sizeLede: 'دليل سريع حسب العمر والطول (سم). عند الشك، اختر الأكبر — الأطفال يكبرون بسرعة.',
    ageCol: 'العمر', heightCol: 'الطول', wheelCol: 'العجلة',
    rangeTitle: 'فئتان',
    classicName: 'كلاسيك', classicDesc: 'هيكل فولاذي متين مع عجلات جانبية سريعة الفك. الخيار الواثق للمبتدئين.',
    proName: 'برو ألمنيوم', proDesc: 'هيكل ألمنيوم أخف للأطفال الأكبر والأسرع. أسهل في الحمل وأخف في القيادة.',
    from: 'ابتداءً من',
    lineupTitle: 'كل التشكيلة', lineupLede: 'كل مقاس ولون، جاهز للشحن.',
    specTitle: 'معلومات مفيدة',
    specs: [
      { k: 'التركيب', v: 'حوالي دقيقتين، أداة واحدة مرفقة' },
      { k: 'العجلات الجانبية', v: 'مثبّتات سريعة الفك (كلاسيك)' },
      { k: 'الهيكل', v: 'فولاذ (كلاسيك) · ألمنيوم (برو)' },
      { k: 'المقاسات', v: '١٢″، ١٤″، ١٦″، ٢٠″' },
    ],
    helpTitle: 'غير متأكد من الاختيار؟', helpLede: 'أخبرنا بعمر طفلك وطوله — وسنختار الدراجة المثالية معك.',
    whatsapp: 'اسألنا على واتساب', backToShop: 'تصفّح المتجر بالكامل',
    waMsg: 'مرحبًا تايني إنكس! أريد المساعدة في اختيار دراجة أطفال ويمزي ويلز.',
    empty: 'دراجاتنا في الطريق قريبًا — عُد إلينا بعد قليل!',
  },
};

const fadeKey = (s) => `${s.handle}`;

export default function BikesClient({ bikes, locale, whatsappHref }) {
  const t = T[locale] || T.en;
  const cart = useCart();
  const [added, setAdded] = useState(false);

  /* group the flat catalogue into range → size → colour */
  const ranges = useMemo(() => {
    const order = ['classic', 'pro'];
    const present = order.filter((m) => bikes.some((b) => b.model === m));
    return present.length ? present : [...new Set(bikes.map((b) => b.model))];
  }, [bikes]);

  const [model, setModel] = useState(ranges[0]);
  const sizesFor = (m) => [...new Set(bikes.filter((b) => b.model === m).map((b) => b.size))].sort((a, b) => a - b);
  const [size, setSize] = useState(sizesFor(ranges[0])[0]);
  const coloursFor = (m, s) => bikes.filter((b) => b.model === m && b.size === s);
  const [color, setColor] = useState(coloursFor(ranges[0], sizesFor(ranges[0])[0])[0]?.color);

  const pickModel = (m) => {
    setModel(m);
    const s = sizesFor(m)[0];
    setSize(s);
    setColor(coloursFor(m, s)[0]?.color);
    setAdded(false);
  };
  const pickSize = (s) => {
    setSize(s);
    const cols = coloursFor(model, s);
    if (!cols.some((c) => c.color === color)) setColor(cols[0]?.color);
    setAdded(false);
  };
  const pickColor = (c) => { setColor(c); setAdded(false); };

  const selected = coloursFor(model, size).find((b) => b.color === color) || coloursFor(model, size)[0] || bikes[0];
  const sizes = sizesFor(model);
  const colours = coloursFor(model, size);

  const rangeLabel = (m) => (m === 'pro' ? t.proName : t.classicName);
  const priceFrom = (m) => Math.min(...bikes.filter((b) => b.model === m).map((b) => b.price));

  const addToCart = () => {
    if (!selected?.available) return;
    cart.add(selected.product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  if (!bikes.length) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center">
        <Bike className="mx-auto h-12 w-12 text-coral" strokeWidth={1.6} />
        <p className="mt-4 text-lg text-muted-foreground">{t.empty}</p>
        <Link href={`/${locale}/shop`} className="ui-btn ui-btn-primary mt-6">{t.backToShop}</Link>
      </div>
    );
  }

  return (
    <div className="bk">
      {/* ============================ HERO ============================ */}
      <section className="bk-hero" aria-label={t.eyebrow}>
        <picture className="bk-hero-img">
          <source media="(max-width: 720px)" srcSet="/bikes/hero-mobile.png" />
          <img src="/bikes/hero-desktop.png" alt="" aria-hidden="true" fetchPriority="high" />
        </picture>
        {/* decorative floating shapes */}
        <span className="bk-orb bk-orb-1" aria-hidden="true" />
        <span className="bk-orb bk-orb-2" aria-hidden="true" />
        <Sparkles className="bk-spark bk-spark-1" aria-hidden="true" strokeWidth={1.5} />
        <Sparkles className="bk-spark bk-spark-2" aria-hidden="true" strokeWidth={1.5} />

        <div className="bk-hero-copy">
          <span className="eyebrow-new text-coral">{t.eyebrow}</span>
          <h1 className="bk-h1 display-xl">
            {t.h1}<br /><span className="text-coral">{t.h1b}</span>
          </h1>
          <p className="bk-sub">{t.sub}</p>
          <div className="bk-hero-cta">
            <a href="#build" className="ui-btn ui-btn-primary ui-btn-lg">{t.ctaBuild}<ArrowRight className="h-4 w-4 rtl:rotate-180" /></a>
            <a href="#sizes" className="ui-btn ui-btn-secondary ui-btn-lg">{t.ctaSizes}</a>
          </div>
        </div>
      </section>

      {/* ============================ TRUST STRIP ============================ */}
      <section className="bk-trust">
        {t.badges.map(({ Icon, t: label }, i) => (
          <div key={i} className="bk-trust-item">
            <Icon className="h-5 w-5 text-coral" strokeWidth={2} />
            <span>{label}</span>
          </div>
        ))}
      </section>

      {/* ============================ BUILD / PICKER ============================ */}
      <section id="build" className="bk-build">
        <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
          <Reveal className="text-center">
            <span className="eyebrow-new text-coral">{t.buildTitle}</span>
            <h2 className="display-lg mt-2">{t.buildLede}</h2>
          </Reveal>

          <div className="bk-build-grid">
            {/* selected bike image */}
            <div className="bk-stage">
              <div className="bk-stage-glow" style={{ background: `radial-gradient(circle, ${COLOR_HEX[selected?.color] || 'var(--coral)'}33, transparent 70%)` }} aria-hidden="true" />
              {selected?.image ? (
                <img key={fadeKey(selected)} src={selected.image} alt={selected.name} className="bk-stage-img bk-float" />
              ) : <Bike className="h-40 w-40 text-muted-foreground" strokeWidth={1} />}
              {!selected?.available && <span className="bk-soldout">{t.soldout}</span>}
            </div>

            {/* controls */}
            <div className="bk-controls">
              {ranges.length > 1 && (
                <div className="bk-field">
                  <span className="bk-label">{t.model}</span>
                  <div className="bk-seg">
                    {ranges.map((m) => (
                      <button key={m} type="button" onClick={() => pickModel(m)} aria-pressed={model === m}
                        className={`bk-seg-btn ${model === m ? 'is-on' : ''}`}>{rangeLabel(m)}</button>
                    ))}
                  </div>
                </div>
              )}

              <div className="bk-field">
                <span className="bk-label">{t.size} · <em className="not-italic text-muted-foreground">{t.fits} {AGE[size]}</em></span>
                <div className="bk-chips">
                  {sizes.map((s) => (
                    <button key={s} type="button" onClick={() => pickSize(s)} aria-pressed={size === s}
                      className={`bk-chip ${size === s ? 'is-on' : ''}`}>
                      <strong>{s}″</strong><small>{AGE[s]}</small>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bk-field">
                <span className="bk-label">{t.colour} · <em className="not-italic text-muted-foreground">{selected?.color}</em></span>
                <div className="bk-swatches">
                  {colours.map((b) => (
                    <button key={b.color} type="button" onClick={() => pickColor(b.color)} aria-label={b.color} aria-pressed={color === b.color}
                      className={`bk-swatch ${color === b.color ? 'is-on' : ''} ${!b.available ? 'is-out' : ''}`}
                      style={{ '--sw': COLOR_HEX[b.color] || '#bbb' }}>
                      {color === b.color && <Check className="h-4 w-4" strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bk-buy">
                <div className="bk-price">
                  <span className="money">{formatPrice(selected?.price, selected?.currency, locale)}</span>
                  <small>{t.wrapNote}</small>
                </div>
                <div className="bk-buy-actions">
                  <button type="button" onClick={addToCart} disabled={!selected?.available}
                    className={`ui-btn ui-btn-lg ui-btn-block ${added ? 'bk-added' : 'ui-btn-primary'}`}>
                    {selected?.available ? (added ? t.added : t.add) : t.soldout}
                  </button>
                  {selected?.handle && (
                    <Link href={`/${locale}/product/${selected.handle}`} className="ui-btn ui-btn-quiet ui-btn-sm">{t.details}</Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================ FEATURES ============================ */}
      <section className="bk-features">
        <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
          <Reveal className="text-center"><h2 className="display-lg">{t.featTitle}</h2></Reveal>
          <div className="bk-feat-grid">
            {t.features.map(({ Icon, t: title, d }, i) => (
              <Reveal key={title} delay={i * 0.07}>
                <div className="bk-feat">
                  <span className="bk-feat-ico"><Icon className="h-6 w-6" strokeWidth={2} /></span>
                  <h3>{title}</h3>
                  <p>{d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============================ SIZE GUIDE ============================ */}
      <section id="sizes" className="bk-sizes">
        <div className="mx-auto max-w-[1100px] px-5 sm:px-8">
          <Reveal className="text-center">
            <span className="eyebrow-new text-coral">{t.sizeTitle}</span>
            <h2 className="display-lg mt-2">{t.sizeLede}</h2>
          </Reveal>
          <div className="bk-size-grid">
            {[12, 14, 16, 20].map((s, i) => (
              <Reveal key={s} delay={i * 0.06}>
                <div className={`bk-size-card ${size === s ? 'is-on' : ''}`}>
                  <div className="bk-size-wheel"><Bike className="h-7 w-7" strokeWidth={1.8} /></div>
                  <strong className="bk-size-in">{s}″</strong>
                  <dl>
                    <div><dt>{t.ageCol}</dt><dd>{AGE[s]}</dd></div>
                    <div><dt>{t.heightCol}</dt><dd>{HEIGHT[s]} cm</dd></div>
                    <div><dt>{t.wheelCol}</dt><dd>{s}″</dd></div>
                  </dl>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============================ CLASSIC vs PRO ============================ */}
      {ranges.length > 1 && (
        <section className="bk-ranges">
          <div className="mx-auto max-w-[1100px] px-5 sm:px-8">
            <Reveal className="text-center"><h2 className="display-lg">{t.rangeTitle}</h2></Reveal>
            <div className="bk-range-grid">
              {[
                { m: 'classic', name: t.classicName, desc: t.classicDesc, Icon: ShieldCheck },
                { m: 'pro', name: t.proName, desc: t.proDesc, Icon: Feather },
              ].filter((r) => bikes.some((b) => b.model === r.m)).map((r, i) => (
                <Reveal key={r.m} delay={i * 0.08}>
                  <div className="bk-range-card">
                    <span className="bk-feat-ico"><r.Icon className="h-6 w-6" strokeWidth={2} /></span>
                    <h3>{r.name}</h3>
                    <p>{r.desc}</p>
                    <span className="bk-range-price">{t.from} <strong>{formatPrice(priceFrom(r.m), 'AED', locale)}</strong></span>
                    <button type="button" onClick={() => pickModel(r.m)} className="ui-btn ui-btn-secondary ui-btn-sm mt-3">{t.ctaBuild}</button>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============================ FULL LINE-UP ============================ */}
      <section className="bk-lineup">
        <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
          <Reveal className="text-center">
            <span className="eyebrow-new text-coral">{t.lineupTitle}</span>
            <h2 className="display-lg mt-2">{t.lineupLede}</h2>
          </Reveal>
          <div className="bk-lineup-grid">
            {bikes.map((b, i) => (
              <Reveal key={b.handle} delay={(i % 4) * 0.05}>
                <Link href={`/${locale}/product/${b.handle}`} className={`bk-card ${!b.available ? 'is-out' : ''}`}>
                  <div className="bk-card-img">
                    {b.image ? <img src={b.image} alt={b.name} loading="lazy" decoding="async" /> : <Bike className="h-16 w-16 text-muted-foreground" />}
                    {!b.available && <span className="bk-soldout bk-soldout-sm">{t.soldout}</span>}
                  </div>
                  <div className="bk-card-body">
                    <span className="bk-card-dot" style={{ background: COLOR_HEX[b.color] || '#bbb' }} aria-hidden="true" />
                    <span className="bk-card-name">{b.name}</span>
                    <span className="money bk-card-price">{formatPrice(b.price, b.currency, locale)}</span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============================ SPECS + HELP ============================ */}
      <section className="bk-close">
        <div className="mx-auto grid max-w-[1100px] gap-8 px-5 sm:px-8 lg:grid-cols-[1fr_1fr]">
          <Reveal>
            <div className="bk-specs">
              <h3 className="eyebrow-new text-coral">{t.specTitle}</h3>
              <dl>
                {t.specs.map((s) => (
                  <div key={s.k}><dt>{s.k}</dt><dd>{s.v}</dd></div>
                ))}
              </dl>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="bk-help">
              <Sparkles className="h-8 w-8 text-coral" strokeWidth={1.6} />
              <h3 className="display-md mt-3">{t.helpTitle}</h3>
              <p className="mt-2 text-muted-foreground">{t.helpLede}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href={`${whatsappHref}?text=${encodeURIComponent(t.waMsg)}`} target="_blank" rel="noreferrer" className="ui-btn ui-btn-primary">
                  <MessageCircle className="h-4 w-4" /> {t.whatsapp}
                </a>
                <Link href={`/${locale}/shop`} className="ui-btn ui-btn-secondary">{t.backToShop}</Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
