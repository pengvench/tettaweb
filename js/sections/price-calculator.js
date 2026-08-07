const SHOOT_RATE = 4500;

const EDIT_TIERS = {
    none: { name: 'БЕЗ МОНТАЖА', price: 0 },
    basic: { name: 'БАЗОВЫЙ', price: 1500 },
    dynamic: { name: 'ДИНАМИЧНЫЙ', price: 3500 }
};

// Объемная скидка на монтаж: чем длиннее видео, тем ниже цена за минуту.
// Основание — не каждая минута насыщена одинаково, поэтому с ростом объема
// доля «легких» минут растет и скидка увеличивается.
const EDIT_VOLUME_DISCOUNTS = {
    basic: [
        [41, 0.25],
        [21, 0.20],
        [11, 0.15],
        [6, 0.10],
        [0, 0]
    ],

    dynamic: [
        [41, 0.50],
        [31, 0.48],
        [21, 0.45],
        [16, 0.42],
        [11, 0.38],
        [8, 0.34],
        [6, 0.31],
        [5, 0.29],
        [4, 0.21],
        [3, 0.14],
        [0, 0]
    ]
};


const REELS_PACKS = [
    { id: '1-2', label: '1–2 шт', count: 1, discount: 0 },
    { id: '3-5', label: '3–5 шт', count: 3, discount: 0.05 },
    { id: '10-15', label: '10–15 шт', count: 10, discount: 0.15 },
    { id: '20-30', label: '20–30 шт', count: 20, discount: 0.3 },
    { id: '40-50', label: '40–50 шт', count: 40, discount: 0.3 }
];

const REPORT_VIDEO_PACKS = [
    { id: '1-3', label: '1–3 мин', minutes: 3, discount: 0 },
    { id: '5-10', label: '5–10 мин', minutes: 5, discount: 0.05 },
    { id: '10-20', label: '10–20 мин', minutes: 10, discount: 0.1 },
    { id: '20-30', label: '20–30 мин', minutes: 20, discount: 0.18 }
];

const PACKAGES = {
    promo: {
        name: 'ПРОМО-РОЛИК',
        intro: 'Рекламная подача для продукта, услуги, события или презентации компании.',
        shootHours: 4,
        shootMax: 12,
        editTier: 'basic',
        editMinutes: 2,
        editMax: 5,
        features: [
            'бриф и сценарный план',
            'съемка до 4 часов',
            'камера, свет и запись звука',
            'базовый монтаж до 2 минут',
            'цветокоррекция и саунд-дизайн',
            'моушен-дизайн, инфографика и титры',
            '2 круга правок'
        ]
    },
    ad: {
        name: 'РЕКЛАМНЫЙ РОЛИК',
        intro: 'Имиджевое или продающее видео с более детальной проработкой подачи.',
        shootHours: 5,
        shootMax: 12,
        editTier: 'basic',
        editMinutes: 2,
        editMax: 8,
        features: [
            'бриф и разработка подачи',
            'сценарный план',
            'съемка до 5 часов',
            'камера, свет и запись звука',
            'базовый монтаж до 2 минут',
            'цветокоррекция, звук, моушен-дизайн и инфографика',
            '2 круга правок'
        ]
    },
    clip: {
        name: 'МУЗЫКАЛЬНЫЙ КЛИП',
        intro: 'Визуальная история для артиста: от обсуждения идеи до готового клипа.',
        shootHours: 6,
        shootMax: 12,
        editTier: 'basic',
        editMinutes: 4,
        editMax: 10,
        features: [
            'обсуждение идеи и референсов',
            'сценарный план',
            'съемочная смена до 6 часов',
            'камера и базовый свет',
            'авторский монтаж до 4 минут',
            'цветокоррекция и саунд-дизайн',
            '2 круга правок'
        ]
    },
    interview: {
        name: 'ИНТЕРВЬЮ',
        intro: 'Разговорный формат для эксперта, команды или героя проекта.',
        shootHours: 2,
        shootMax: 12,
        editTier: 'basic',
        editMinutes: 10,
        editMax: 60,
        features: [
            'подготовка площадки',
            'съемка до 2 часов',
            'камера, свет и запись звука',
            'монтаж интервью до 10 минут',
            'цветокоррекция и чистка звука',
            'титры и простые плашки',
            '1 круг правок'
        ]
    },
    podcast: {
        name: 'ПОДКАСТ',
        intro: 'Разговорный выпуск с аккуратной сборкой материала и чистым звуком.',
        shootHours: 3,
        shootMax: 12,
        editTier: 'basic',
        editMinutes: 30,
        editMax: 120,
        features: [
            'подготовка площадки',
            'съемка до 3 часов',
            'камера, свет и запись звука',
            'монтаж выпуска до 30 минут',
            'цветокоррекция и чистка звука',
            'титры и простые плашки',
            '1 круг правок'
        ]
    },
    report: {
        name: 'ОТЧЕТНЫЙ РОЛИК',
        intro: 'Живое видео с мероприятия, открытия, выступления или события.',
        shootHours: 3,
        shootMax: 12,
        editTier: 'basic',
        editMinutes: 3,
        editMax: 0,
        reportVideoPackId: '1-3',
        volumeType: 'reportVideo',
        features: [
            'съемка события до 3 часов',
            'общие и детальные планы',
            'живые эмоции и атмосфера',
            'базовый монтаж ролика до 3 минут',
            'цветокоррекция и саунд-дизайн',
            'простые титры',
            '2 круга правок'
        ]
    },
    reels: {
        name: 'REELS / SHORTS',
        intro: 'Вертикальный ролик для эксперта, артиста или личного проекта.',
        shootHours: 1,
        shootMax: 6,
        editTier: 'basic',
        editMinutes: 1,
        editMax: 0,
        reelsCount: 1,
        reelsPackId: '1-2',
        volumeType: 'reels',
        features: [
            'идея и план кадров',
            'съемка до 1 часа',
            'вертикальный формат',
            'базовый монтаж ролика',
            'субтитры и акценты',
            'моушен-дизайн и инфографика',
            '2 круга правок'
        ]
    },
    shoot: {
        name: 'ТОЛЬКО СЪЕМКА',
        intro: 'Снимем материал и передадим исходники для дальнейшей работы.',
        shootHours: 2,
        shootMax: 12,
        editTier: 'none',
        editMinutes: 0,
        editMax: 0,
        features: [
            'работа оператора',
            'камера и базовый свет',
            'запись чистого звука',
            'общие и детальные планы',
            'подготовка техники',
            'передача исходников'
        ]
    },
    edit: {
        name: 'ТОЛЬКО МОНТАЖ',
        intro: 'Соберем готовое видео из ваших исходных материалов.',
        shootHours: 0,
        shootMax: 0,
        editTier: 'basic',
        editMinutes: 5,
        editMax: 120,
        features: [
            'отбор и сборка материала',
            'цветокоррекция',
            'чистка и выравнивание звука',
            'субтитры при необходимости',
            'плашки, моушен-дизайн и инфографика',
            '1 круг правок'
        ]
    }
};

const MANUAL_OPTIONS = [
    { name: 'СТУДИЯ ИЛИ ПЛАТНАЯ ЛОКАЦИЯ', price: 'от 2 000 ₽' },
    { name: 'ДОПОЛНИТЕЛЬНАЯ КАМЕРА / ОПЕРАТОР', price: 'от 4 500 ₽ / час' },
    { name: 'АЭРОСЪЕМКА', price: 'от 8 000 ₽' },
    { name: 'МОУШЕН-ДИЗАЙН И ИНФОГРАФИКА', price: 'от 5 000 ₽' },
    { name: 'ДИКТОРСКАЯ ОЗВУЧКА', price: 'от 3 500 ₽' },
    { name: 'СРОЧНЫЙ МОНТАЖ', price: 'от +30%' }
];

const money = (value) => `${Math.round(value).toLocaleString('ru-RU')} ₽`;

function numberOptions(min, max, active, unit) {
    const start = Math.max(0, Number(min));
    const end = Math.max(start, Number(max));
    return Array.from({ length: end - start + 1 }, (_, index) => {
        const value = start + index;
        return option(value, `${value} ${unit}`, active);
    }).join('');
}

function getReelsPack(packId) {
    return REELS_PACKS.find((pack) => pack.id === packId) || REELS_PACKS[0];
}

function reelsPackOptions(active) {
    return REELS_PACKS.map((pack) => {
        const discount = pack.discount ? ` / −${Math.round(pack.discount * 100)}%` : '';
        return option(pack.id, `${pack.label}${discount}`, active);
    }).join('');
}

function getReportVideoPack(packId) {
    return REPORT_VIDEO_PACKS.find((pack) => pack.id === packId) || REPORT_VIDEO_PACKS[0];
}

function reportVideoPackOptions(active) {
    return REPORT_VIDEO_PACKS.map((pack) => {
        const discount = pack.discount ? ` / −${Math.round(pack.discount * 100)}%` : '';
        return option(pack.id, `${pack.label}${discount}`, active);
    }).join('');
}

function getManualOption(name) {
    return MANUAL_OPTIONS.find((item) => item.name === name);
}

function unitForKey(key) {
    if (key === 'shootHours') return 'Ч';
    if (key === 'reelsCount') return 'ШТ';
    return 'МИН';
}

function getEditDiscount(minutes, tier) {
    if (tier === 'none') return 0;
    const rules = EDIT_VOLUME_DISCOUNTS[tier] || EDIT_VOLUME_DISCOUNTS.basic;
    const match = rules.find(([threshold]) => minutes >= threshold);
    return match ? match[1] : 0;
}


function getShootDiscount(hours) {
    return hours >= 3 ? 0.15 : 0;
}

function getReelsDiscount(packId, tier) {
    if (tier === 'none') return 0;
    const pack = getReelsPack(packId);
    return Math.max(pack.discount, getEditDiscount(pack.count, tier));
}

function getReportVideoDiscount(packId, tier) {
    if (tier === 'none') return 0;
    const pack = getReportVideoPack(packId);
    return Math.max(pack.discount, getEditDiscount(pack.minutes, tier));
}


function option(value, label, active) {
    return `<option value="${value}"${String(value) === String(active) ? ' selected' : ''}>${label}</option>`;
}

export function initPriceCalculator() {
    const root = document.querySelector('[data-price-calculator]');
    if (!root || root.dataset.priceReady === 'true') return;
    root.dataset.priceReady = 'true';

    const options = root.querySelector('[data-price-options]');
    const total = root.querySelector('[data-price-total]');
    const shootCost = root.querySelector('[data-price-service]');
    const editCost = root.querySelector('[data-price-addons]');
    const discountCost = root.querySelector('[data-price-discount]');
    const selection = root.querySelector('[data-price-selection]');
    const mobileTotal = root.querySelector('[data-price-mobile-total]');
    const scrollSurface = root.querySelector(':scope > .stack-card__surface');

    const state = {
        packageId: 'report',
        shootHours: PACKAGES.report.shootHours,
        editTier: PACKAGES.report.editTier,
        editMinutes: PACKAGES.report.editMinutes,
        reelsCount: 1,
        reelsPackId: REELS_PACKS[0].id,
        reportVideoPackId: PACKAGES.report.reportVideoPackId || REPORT_VIDEO_PACKS[0].id,
        manualOptions: new Set()
    };

    function calculate() {
        const selected = PACKAGES[state.packageId];
        const tier = EDIT_TIERS[state.editTier];
        const reelsPack = selected.volumeType === 'reels' ? getReelsPack(state.reelsPackId) : null;
        const reportVideoPack = selected.volumeType === 'reportVideo' ? getReportVideoPack(state.reportVideoPackId) : null;
        const shootBeforeDiscount = SHOOT_RATE * state.shootHours;
        const shootDiscount = shootBeforeDiscount * getShootDiscount(state.shootHours);
        const editVolume = reelsPack ? reelsPack.count : reportVideoPack ? reportVideoPack.minutes : state.editMinutes;
        const editBeforeDiscount = tier.price * editVolume;
        const editDiscountRate = reelsPack
            ? getReelsDiscount(state.reelsPackId, state.editTier)
            : reportVideoPack
                ? getReportVideoDiscount(state.reportVideoPackId, state.editTier)
                : getEditDiscount(state.editMinutes, state.editTier);
        const editDiscount = editBeforeDiscount * editDiscountRate;

        return {
            tier,
            shoot: shootBeforeDiscount - shootDiscount,
            edit: editBeforeDiscount - editDiscount,
            discount: shootDiscount + editDiscount,
            total: shootBeforeDiscount + editBeforeDiscount - shootDiscount - editDiscount
        };
    }

    function applyPackage(packageId) {
        const selected = PACKAGES[packageId];
        state.packageId = packageId;
        state.shootHours = selected.shootHours;
        state.editTier = selected.editTier;
        state.editMinutes = selected.editMinutes;
        state.reelsPackId = selected.reelsPackId || REELS_PACKS[0].id;
        state.reelsCount = selected.reelsCount || getReelsPack(state.reelsPackId).count;
        state.reportVideoPackId = selected.reportVideoPackId || REPORT_VIDEO_PACKS[0].id;
        if (selected.volumeType === 'reportVideo') {
            state.editMinutes = getReportVideoPack(state.reportVideoPackId).minutes;
        }
    }

    function renderOptions() {
        const selected = PACKAGES[state.packageId];
        const hasShoot = selected.shootMax > 0;
        const isReels = selected.volumeType === 'reels';
        const isReportVideo = selected.volumeType === 'reportVideo';
        const hasEdit = state.editTier !== 'none' && (selected.editMax > 0 || isReels || isReportVideo);
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        const showConfig = !isMobile;
        const renderAmountControl = ({ key, label, value, min, max, disabled }) => {
            const unit = unitForKey(key);
            return `
                <label class="price-calculator__field price-calculator__field--range price-calculator__field--number${disabled ? ' is-disabled' : ''}">
                    <span>${label} <b data-price-value="${key}">${value} ${unit}</b></span>
                    ${isMobile
                        ? `<select data-price-number="${key}"${disabled ? ' disabled' : ''}>
                            ${numberOptions(min, max, value, unit)}
                        </select>`
                        : `<input type="range" min="${min}" max="${max}" value="${value}" data-price-range="${key}"${disabled ? ' disabled' : ''}>`}
                </label>
            `;
        };
        const renderReelsPackControl = ({ disabled }) => {
            const pack = getReelsPack(state.reelsPackId);
            return `
                <label class="price-calculator__field price-calculator__field--number${disabled ? ' is-disabled' : ''}">
                    <span>ПАК РИЛСОВ <b data-price-value="reelsPackId">${pack.label}</b></span>
                    <select data-price-pack="reelsPackId"${disabled ? ' disabled' : ''}>
                        ${reelsPackOptions(state.reelsPackId)}
                    </select>
                </label>
            `;
        };
        const renderReportVideoPackControl = ({ disabled }) => {
            const pack = getReportVideoPack(state.reportVideoPackId);
            return `
                <label class="price-calculator__field price-calculator__field--number${disabled ? ' is-disabled' : ''}">
                    <span>ГОТОВОЕ ВИДЕО <b data-price-value="reportVideoPackId">${pack.label}</b></span>
                    <select data-price-pack="reportVideoPackId"${disabled ? ' disabled' : ''}>
                        ${reportVideoPackOptions(state.reportVideoPackId)}
                    </select>
                </label>
            `;
        };
        const shootControl = renderAmountControl({
            key: 'shootHours',
            label: 'СЪЕМКА',
            value: state.shootHours,
            min: hasShoot ? 1 : 0,
            max: selected.shootMax,
            disabled: !hasShoot
        });
        let volumeControl;
        if (isReels) {
            volumeControl = renderReelsPackControl({ disabled: !hasEdit });
        } else if (isReportVideo) {
            volumeControl = renderReportVideoPackControl({ disabled: !hasEdit });
        } else {
            volumeControl = renderAmountControl({
                key: 'editMinutes',
                label: 'ГОТОВОЕ ВИДЕО',
                value: state.editMinutes,
                min: hasEdit ? 1 : 0,
                max: selected.editMax,
                disabled: !hasEdit
            });
        }
        options.innerHTML = `
            <div class="price-calculator__controls">
                <label class="price-calculator__field price-calculator__field--wide">
                    <span>ТИП ПРОЕКТА</span>
                    <select data-price-package>
                        ${Object.entries(PACKAGES).map(([id, item]) => option(id, item.name, state.packageId)).join('')}
                    </select>
                </label>

                <details class="price-calculator__config" data-price-config${showConfig ? ' open' : ''}>
                    <summary>НАСТРОИТЬ ПАРАМЕТРЫ <span>раскрыть +</span></summary>
                    <div class="price-calculator__config-grid">
                        <label class="price-calculator__field">
                            <span>МОНТАЖ</span>
                            <select data-price-control="editTier">
                                ${Object.entries(EDIT_TIERS).map(([id, tier]) => option(id, tier.name, state.editTier)).join('')}
                            </select>
                        </label>

                        ${isMobile ? `<div class="price-calculator__quantity-row">${shootControl}${volumeControl}</div>` : `${shootControl}${volumeControl}`}
                    </div>
                </details>
            </div>

            <div class="price-calculator__package">
                <div class="price-calculator__package-head">
                    <div>
                        <span>БАЗОВЫЙ ПАКЕТ</span>
                        <h3>${selected.name}</h3>
                    </div>
                    <b>от ${money(calculate().total)}</b>
                </div>
                <p>${selected.intro}</p>
                <div class="price-calculator__feature-list">
                    ${selected.features.map((feature) => `<span>${feature}</span>`).join('')}
                </div>
            </div>

            <details class="price-calculator__extras">
                <summary>ДОПОЛНИТЕЛЬНЫЕ ЗАДАЧИ <span>раскрыть +</span></summary>
                <p>Отметьте нужное. Суммы ниже — стартовые ориентиры, финал зависит от задачи, площадки и сроков.</p>
                <div class="price-calculator__addons">
                    ${MANUAL_OPTIONS.map((item) => `
                        <label class="price-calculator__addon">
                            <input type="checkbox" value="${item.name}" data-price-manual-option${state.manualOptions.has(item.name) ? ' checked' : ''}>
                            <span>${item.name}</span>
                            <b>${item.price}</b>
                        </label>
                    `).join('')}
                </div>
            </details>

            <p class="price-calculator__hint">
                Съемка считается по ${money(SHOOT_RATE)} за час: при заказе от 3 часов скидка 15%.
                Чем длиннее монтаж — тем ниже цена за минуту: «Базовый» до −25%,
                «Динамичный» до −50% на больших объемах.
                ${isReels
                    ? 'Паки reels: 1–2 без скидки, 3–5 со скидкой 5%, 10–15 со скидкой 15%, 20–30 со скидкой 30%, 40–50 со скидкой 30%.'
                    : isReportVideo
                        ? 'Паки отчетника: 1–3 минуты без скидки, дальше объемные пакеты 5–10, 10–20 и 20–30 минут со скидкой на монтаж.'
                        : ''}
            </p>

        `;
    }

    function renderSummary() {
        const result = calculate();
        const selected = PACKAGES[state.packageId];
        const reelsPack = selected.volumeType === 'reels' ? getReelsPack(state.reelsPackId) : null;
        const reportVideoPack = selected.volumeType === 'reportVideo' ? getReportVideoPack(state.reportVideoPackId) : null;
        total.textContent = money(result.total);
        if (mobileTotal) mobileTotal.textContent = money(result.total);
        shootCost.textContent = money(result.shoot);
        editCost.textContent = money(result.edit);
        discountCost.textContent = `− ${money(result.discount)}`;

        const items = [
            `<div><span>${selected.name}</span><b>базовый пакет</b></div>`,
            ...(state.shootHours ? [`<div><span>СЪЕМКА</span><b>${state.shootHours} ч × ${money(SHOOT_RATE)}</b></div>`] : []),
            ...(state.editTier !== 'none' ? [`<div><span>${result.tier.name}</span><b>${reelsPack ? `${reelsPack.label} / от ${reelsPack.count} рол.` : reportVideoPack ? reportVideoPack.label : `${state.editMinutes} мин`}</b></div>`] : []),
            ...Array.from(state.manualOptions).map((name) => {
                const item = getManualOption(name);
                return `<div><span>${name}</span><b>${item ? item.price : 'отдельно'}</b></div>`;
            })
        ];
        selection.innerHTML = items.join('');
    }

    function render() {
        renderOptions();
        renderSummary();
    }

    function updateNumericControl(key, value) {
        state[key] = Number(value);
        const label = options.querySelector(`[data-price-value="${key}"]`);
        if (label) label.textContent = `${state[key]} ${unitForKey(key)}`;
        renderSummary();
    }

    options.addEventListener('change', (event) => {
        if (event.target.matches('[data-price-package]')) {
            applyPackage(event.target.value);
            render();
            return;
        }

        const key = event.target.dataset.priceControl;
        if (key) {
            state[key] = event.target.value;
            if (key === 'editTier' && state.editTier === 'none') state.editMinutes = 0;
            if (key === 'editTier' && state.editTier !== 'none' && state.editMinutes === 0) state.editMinutes = 1;
            render();
            return;
        }

        const numberKey = event.target.dataset.priceNumber;
        if (numberKey) {
            updateNumericControl(numberKey, event.target.value);
            return;
        }

        const packKey = event.target.dataset.pricePack;
        if (packKey === 'reelsPackId') {
            state.reelsPackId = event.target.value;
            state.reelsCount = getReelsPack(state.reelsPackId).count;
            const label = options.querySelector('[data-price-value="reelsPackId"]');
            if (label) label.textContent = getReelsPack(state.reelsPackId).label;
            renderSummary();
            return;
        }

        if (packKey === 'reportVideoPackId') {
            state.reportVideoPackId = event.target.value;
            state.editMinutes = getReportVideoPack(state.reportVideoPackId).minutes;
            const label = options.querySelector('[data-price-value="reportVideoPackId"]');
            if (label) label.textContent = getReportVideoPack(state.reportVideoPackId).label;
            renderSummary();
            return;
        }

        if (!event.target.matches('[data-price-manual-option]')) return;
        if (event.target.checked) state.manualOptions.add(event.target.value);
        else state.manualOptions.delete(event.target.value);
        renderSummary();
    });

    options.addEventListener('input', (event) => {
        const key = event.target.dataset.priceRange;
        if (!key) return;
        updateNumericControl(key, event.target.value);
    });

    function setMobileSummaryOpen(isOpen) {
        root.classList.toggle('is-mobile-summary-open', isOpen);
        document.body.classList.toggle('price-summary-lock', isOpen);

        if (!isOpen && scrollSurface) {
            scrollSurface.style.overscrollBehaviorY = 'auto';
            window.requestAnimationFrame(() => window.dispatchEvent(new Event('scroll')));
        }
    }

    function initMobileScrollGuard() {
        if (!scrollSurface) return;

        let touchStartY = 0;
        let startsAtTop = false;
        let startsAtBottom = false;
        let directionResolved = false;

        const release = () => {
            directionResolved = false;
            scrollSurface.style.overscrollBehaviorY = 'auto';
        };

        scrollSurface.addEventListener('touchstart', (event) => {
            if (!window.matchMedia('(max-width: 768px)').matches) return;

            const maxScrollTop = Math.max(0, scrollSurface.scrollHeight - scrollSurface.clientHeight);
            touchStartY = event.touches[0]?.clientY || 0;
            startsAtTop = scrollSurface.scrollTop <= 2;
            startsAtBottom = scrollSurface.scrollTop >= maxScrollTop - 2;
            directionResolved = false;
            scrollSurface.style.overscrollBehaviorY = 'auto';
        }, { passive: true });

        scrollSurface.addEventListener('touchmove', (event) => {
            if (directionResolved || !window.matchMedia('(max-width: 768px)').matches) return;

            const deltaY = (event.touches[0]?.clientY || 0) - touchStartY;
            if (Math.abs(deltaY) < 4) return;

            const exitsAtTop = startsAtTop && deltaY > 0;
            const exitsAtBottom = startsAtBottom && deltaY < 0;
            scrollSurface.style.overscrollBehaviorY = exitsAtTop || exitsAtBottom ? 'auto' : 'contain';
            directionResolved = true;
        }, { passive: true });

        scrollSurface.addEventListener('touchend', release, { passive: true });
        scrollSurface.addEventListener('touchcancel', release, { passive: true });
    }

    root.querySelector('[data-price-mobile-open]')?.addEventListener('click', () => {
        setMobileSummaryOpen(true);
    });

    root.querySelector('[data-price-mobile-close]')?.addEventListener('click', () => {
        setMobileSummaryOpen(false);
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') setMobileSummaryOpen(false);
    });

    // Мобильный стык с соседними stack-карточками: карточка выше вьюпорта
    // пришпиливается своим последним экраном (sticky с отрицательным top),
    // чтобы следующая секция наезжала на нее так же, как в остальных переходах.
    function initMobileStackPinning() {
        if (!root.classList.contains('stack-card')) return;

        const mq = window.matchMedia('(max-width: 768px)');

        const apply = () => {
            if (!mq.matches) {
                root.style.position = '';
                root.style.top = '';
                return;
            }

            const viewportHeight = window.innerHeight;
            const cardHeight = root.offsetHeight;
            root.style.position = 'sticky';
            root.style.top = `${Math.min(0, Math.round(viewportHeight - cardHeight))}px`;
        };

        apply();
        window.addEventListener('resize', apply, { passive: true });
        mq.addEventListener?.('change', apply);

        if ('ResizeObserver' in window && scrollSurface) {
            new ResizeObserver(apply).observe(scrollSurface);
        }
    }

    render();
    initMobileScrollGuard();
    initMobileStackPinning();
}
