import React, { useState, useRef, useEffect, useCallback } from 'react';

interface WelcomeScreenProps {
  onExploreStay: () => void;
  onExploreServices: () => void;
}

const WELCOME_ASSET_URL = '/assets/aistudio/IMG-20261120-WA3582_6a7bdbdb.jpg';
const TOTAL_PAGES = 2;
const SWIPE_THRESHOLD_PX = 45;
const DRAG_ACTIVATION_PX = 8;

const SCRIPT_FONT_STYLE: React.CSSProperties = {
  fontFamily: "'Kaushan Script', 'Brush Script MT', cursive",
};

/**
 * Exact GondiaStay roof + 4-pane orange window + dual-tone wordmark + curved swoosh logo
 */
const GondiaStayWelcomeLogo: React.FC<{ idPrefix: string }> = ({ idPrefix }) => (
  <div className="flex flex-col items-center select-none">
    {/* Roof with chimney and 2x2 orange window */}
    <svg
      viewBox="0 0 180 54"
      className="w-[126px] sm:w-[144px] h-auto -mb-2.5"
      aria-hidden="true"
    >
      {/* Chimney on left slope */}
      <path d="M51 22 L51 11 L61 11 L61 17 Z" fill="#0E3A78" />
      {/* Pitched navy roof */}
      <path
        d="M16 44 L90 5 L164 44 L152 46 L90 15 L28 46 Z"
        fill="#0E3A78"
      />
      {/* 2x2 Orange window grid */}
      <rect x="81.5" y="25" width="7.2" height="7.2" rx="1" fill="#F36B16" />
      <rect x="91.3" y="25" width="7.2" height="7.2" rx="1" fill="#F36B16" />
      <rect x="81.5" y="34.5" width="7.2" height="7.2" rx="1" fill="#F36B16" />
      <rect x="91.3" y="34.5" width="7.2" height="7.2" rx="1" fill="#F36B16" />
    </svg>

    {/* Wordmark */}
    <div className="flex items-baseline leading-none tracking-[-0.03em] text-[34px] sm:text-[38px] font-extrabold">
      <span className="text-[#0E3A78]">Gondia</span>
      <span className="text-[#F36B16]">Stay</span>
    </div>

    {/* Tapered orange-to-navy curved underline arc */}
    <svg
      viewBox="0 0 220 14"
      className="w-[168px] sm:w-[186px] h-auto mt-0.5"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${idPrefix}LogoArc`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#F57A1F" />
          <stop offset="46%" stopColor="#F36B16" />
          <stop offset="56%" stopColor="#0E3A78" />
          <stop offset="100%" stopColor="#0B2E66" />
        </linearGradient>
      </defs>
      <path
        d="M14 11 Q110 0 206 11 Q110 5.5 14 11 Z"
        fill={`url(#${idPrefix}LogoArc)`}
      />
    </svg>
  </div>
);

/**
 * Shared Gondia heritage skyline + orange side arcs + curved navy tagline footer
 */
const WelcomeSkylineFooter: React.FC<{ variant: 'stay' | 'services' }> = ({ variant }) => (
  <div className="relative w-full shrink-0 select-none pointer-events-none">
    {/* Skyline silhouette with orange curved accents */}
    <svg
      viewBox="0 0 420 96"
      preserveAspectRatio="none"
      className="w-full h-[64px] sm:h-[76px] block -mb-px"
      aria-hidden="true"
    >
      {/* Faint misty background peaks */}
      <path
        d="M0 78 Q55 48 115 62 T230 56 T345 60 T420 50 L420 96 L0 96 Z"
        fill="#E9EFF8"
        opacity="0.7"
      />
      {/* Sweeping orange edge ribbons (left & right) */}
      <path
        d="M0 54 Q40 44 82 64 Q42 56 0 70 Z"
        fill="#F36B16"
      />
      <path
        d="M420 44 Q375 46 334 65 Q376 58 420 64 Z"
        fill="#F36B16"
      />

      {/* Flying birds */}
      <g fill="none" stroke="#184587" strokeWidth="1.2" strokeLinecap="round" opacity="0.75">
        <path d="M98 28 Q101 25 104 28 Q107 25 110 28" />
        <path d="M126 22 Q128 20 130 22 Q132 20 134 22" />
        <path d="M294 26 Q297 23 300 26 Q303 23 306 26" />
        <path d="M318 32 Q320 30 322 32 Q324 30 326 32" />
      </g>

      {/* Navy Gondia Heritage Skyline (temples, domes, towers, trees) */}
      <g fill="#0E3A78">
        {/* Left trees & cottages */}
        <circle cx="14" cy="76" r="10" />
        <circle cx="26" cy="72" r="12" />
        <circle cx="42" cy="76" r="10" />
        <rect x="52" y="56" width="12" height="24" />
        <polygon points="50,56 58,42 66,56" />
        <circle cx="72" cy="74" r="11" />

        {/* Left ornate tower / temple spire */}
        <rect x="86" y="42" width="10" height="38" />
        <polygon points="84,42 91,22 98,42" />
        <line x1="91" y1="16" x2="91" y2="24" stroke="#0E3A78" strokeWidth="2" />

        {/* Arch pavilion */}
        <rect x="98" y="50" width="24" height="30" />
        <path d="M100 50 Q110 34 120 50 Z" />
        <circle cx="110" cy="36" r="2.2" />

        {/* Mid-left slender dome & temple */}
        <rect x="128" y="46" width="14" height="34" />
        <path d="M126 46 Q135 28 144 46 Z" />
        <rect x="148" y="34" width="14" height="46" />
        <path d="M146 34 Q155 14 164 34 Z" />
        <line x1="155" y1="10" x2="155" y2="20" stroke="#0E3A78" strokeWidth="2" />

        {/* Center main heritage dome complex */}
        <rect x="172" y="44" width="38" height="36" />
        <path d="M174 44 Q191 18 208 44 Z" />
        <line x1="191" y1="14" x2="191" y2="26" stroke="#0E3A78" strokeWidth="2.2" />
        <circle cx="191" cy="24" r="3" />
        {/* Side turrets on center complex */}
        <rect x="166" y="50" width="8" height="30" />
        <path d="M165 50 Q170 40 175 50 Z" />
        <rect x="208" y="50" width="8" height="30" />
        <path d="M207 50 Q212 40 217 50 Z" />

        {/* Mid-right tall spire */}
        <rect x="224" y="36" width="13" height="44" />
        <polygon points="222,36 230.5,14 239,36" />
        <rect x="242" y="52" width="18" height="28" />
        <path d="M241 52 Q251 38 261 52 Z" />

        {/* Right temple dome & towers */}
        <rect x="268" y="42" width="26" height="38" />
        <path d="M270 42 Q281 20 292 42 Z" />
        <line x1="281" y1="15" x2="281" y2="25" stroke="#0E3A78" strokeWidth="2" />
        <rect x="299" y="38" width="12" height="42" />
        <polygon points="297,38 305,19 313,38" />
        <rect x="316" y="50" width="22" height="30" />
        <path d="M316 50 Q327 36 338 50 Z" />

        {/* Right trees & greenery */}
        <circle cx="348" cy="72" r="12" />
        <circle cx="364" cy="74" r="11" />
        <rect x="372" y="54" width="14" height="26" />
        <polygon points="370,54 379,40 388,54" />
        <circle cx="394" cy="70" r="13" />
        <circle cx="410" cy="73" r="12" />
      </g>

      {/* Tiny glowing window cutouts inside skyline towers for detail */}
      <g fill="#FFFFFF" opacity="0.85">
        <rect x="90" y="49" width="2" height="5" rx="1" />
        <rect x="108" y="57" width="4" height="6" rx="2" />
        <rect x="153" y="43" width="3.5" height="6" rx="1.5" />
        <rect x="184" y="53" width="4" height="7" rx="2" />
        <rect x="194" y="53" width="4" height="7" rx="2" />
        <rect x="229" y="44" width="3" height="6" rx="1.5" />
        <rect x="279" y="50" width="4" height="7" rx="2" />
        <rect x="303" y="46" width="3" height="6" rx="1.5" />
      </g>

      {/* Curved deep navy bottom crest */}
      <path
        d="M0 78 Q210 56 420 78 L420 96 L0 96 Z"
        fill="#0B316B"
      />
    </svg>

    {/* Deep Navy Tagline Bar */}
    <div
      className="bg-gradient-to-b from-[#0B316B] to-[#082452] pb-[max(14px,env(safe-area-inset-bottom))] pt-0.5 px-4 text-center"
    >
      {variant === 'stay' ? (
        <p
          style={SCRIPT_FONT_STYLE}
          className="text-white text-[18px] sm:text-[21px] tracking-wide leading-snug flex items-center justify-center gap-2"
        >
          <span>Stay</span>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#F36B16] translate-y-[1px]" />
          <span>Eat</span>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#F36B16] translate-y-[1px]" />
          <span>Live Better</span>
        </p>
      ) : (
        <p
          style={SCRIPT_FONT_STYLE}
          className="text-white text-[18px] sm:text-[21px] tracking-wide leading-snug flex items-center justify-center gap-2.5"
        >
          <span>Your Home</span>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#F36B16] translate-y-[1px]" />
          <span>Our Care</span>
        </p>
      )}
    </div>
  </div>
);

/**
 * Page 1 Feature Card Icons (Rental Flats, Rooms & PG, Mess Tiffin)
 */
const RentalFlatsIcon: React.FC = () => (
  <svg viewBox="0 0 64 48" className="w-11 h-9 sm:w-12 sm:h-10" aria-hidden="true">
    {/* Left blue house */}
    <polygon points="4,24 16,13 28,24" fill="#1D56A5" />
    <rect x="7" y="24" width="18" height="20" rx="1" fill="#1D56A5" />
    <rect x="11" y="28" width="4" height="4" rx="0.5" fill="#FFFFFF" />
    <rect x="17" y="28" width="4" height="4" rx="0.5" fill="#FFFFFF" />
    <rect x="13" y="35" width="6" height="9" rx="0.5" fill="#FFFFFF" />
    {/* Right house */}
    <polygon points="36,24 48,13 60,24" fill="#0E3A78" />
    <rect x="39" y="24" width="18" height="20" rx="1" fill="#0E3A78" />
    <rect x="43" y="28" width="4" height="4" rx="0.5" fill="#FFFFFF" />
    <rect x="49" y="28" width="4" height="4" rx="0.5" fill="#FFFFFF" />
    <rect x="45" y="35" width="6" height="9" rx="0.5" fill="#FFFFFF" />
    {/* Center tall house with orange roof & gable */}
    <polygon points="16,22 32,7 48,22" fill="#0E3A78" />
    <polygon points="20,21 32,10 44,21" fill="#F36B16" />
    <rect x="21" y="21" width="22" height="23" rx="1" fill="#FFFFFF" stroke="#0E3A78" strokeWidth="2" />
    <rect x="26" y="25" width="5" height="5" rx="0.5" fill="#F36B16" />
    <rect x="33" y="25" width="5" height="5" rx="0.5" fill="#F36B16" />
    <rect x="29" y="34" width="6" height="10" rx="0.5" fill="#0E3A78" />
  </svg>
);

const RoomsPgIcon: React.FC = () => (
  <svg viewBox="0 0 64 48" className="w-11 h-9 sm:w-12 sm:h-10" aria-hidden="true">
    {/* Headboard & frame */}
    <rect x="8" y="10" width="6" height="32" rx="2.5" fill="#0E3A78" />
    {/* Pillow */}
    <circle cx="21" cy="21" r="4.5" fill="#0E3A78" />
    {/* Mattress / Blanket */}
    <path
      d="M27 17 H48 C53 17 56 20 56 25 V30 H14 V26 H27 Z"
      fill="#0E3A78"
    />
    {/* Bed base bar & legs */}
    <rect x="8" y="29" width="48" height="6.5" rx="2" fill="#0E3A78" />
    <rect x="50" y="34" width="6" height="8" rx="2" fill="#0E3A78" />
  </svg>
);

const MessTiffinIcon: React.FC = () => (
  <svg viewBox="0 0 64 48" className="w-11 h-9 sm:w-12 sm:h-10" aria-hidden="true">
    {/* Fork on left */}
    <path
      d="M11 8 V19 C11 22 13 24 15 24 V41 C15 42.5 17 42.5 17 41 V24 C19 24 21 22 21 19 V8 H19 V17 H17 V8 H15 V17 H13 V8 Z"
      fill="#0E3A78"
    />
    {/* Concentric Plate */}
    <circle cx="34" cy="25" r="15" fill="none" stroke="#0E3A78" strokeWidth="3.2" />
    <circle cx="34" cy="25" r="9.5" fill="#0E3A78" />
    {/* Knife on right */}
    <path
      d="M53 8 C56 10 57 16 57 24 V41 C57 42.5 54 42.5 54 41 V27 H52 V10 C52 8.5 52.5 7.7 53 8 Z"
      fill="#0E3A78"
    />
  </svg>
);

/**
 * Page 2 Service Circle Icons (Maid, Cook, Housekeeping, Laundry, Electrician, Plumber)
 */
const MaidServiceIcon: React.FC = () => (
  <svg viewBox="0 0 48 48" className="w-8 h-8 sm:w-9 sm:h-9" aria-hidden="true">
    {/* Hair bun & bob */}
    <path d="M15 21 C14 12 18 7 24 7 C30 7 34 12 33 21 C35 23 35 26 32 27 H16 C13 26 13 23 15 21 Z" fill="#0E3A78" />
    {/* Face */}
    <circle cx="24" cy="18.5" r="6" fill="#FFFFFF" />
    {/* Smile */}
    <path d="M21.8 19.5 Q24 21.5 26.2 19.5" fill="none" stroke="#0E3A78" strokeWidth="1.5" strokeLinecap="round" />
    {/* Uniform & Apron */}
    <path d="M13 40 C13 31 17.5 27 24 27 C30.5 27 35 31 35 40 Z" fill="#0E3A78" />
    <path d="M19 29 H29 L30.5 40 H17.5 Z" fill="#FFFFFF" />
    <path d="M20 27 L24 31 L28 27" fill="none" stroke="#FFFFFF" strokeWidth="1.8" />
  </svg>
);

const CookServiceIcon: React.FC = () => (
  <svg viewBox="0 0 48 48" className="w-8 h-8 sm:w-9 sm:h-9" aria-hidden="true">
    {/* Chef Hat */}
    <path
      d="M15 27 C10 26 8 21 10 17 C11.5 14 15 13 17.5 14 C19 10 22 9 24 9 C26 9 29 10 30.5 14 C33 13 36.5 14 38 17 C40 21 38 26 33 27 V36 C33 37.5 31.8 38.5 30.2 38.5 H17.8 C16.2 38.5 15 37.5 15 36 Z"
      fill="none"
      stroke="#0E3A78"
      strokeWidth="2.8"
      strokeLinejoin="round"
    />
    <line x1="15" y1="32" x2="33" y2="32" stroke="#0E3A78" strokeWidth="2.5" />
    <line x1="20" y1="21" x2="20" y2="27" stroke="#0E3A78" strokeWidth="2.2" strokeLinecap="round" />
    <line x1="24" y1="19" x2="24" y2="27" stroke="#0E3A78" strokeWidth="2.2" strokeLinecap="round" />
    <line x1="28" y1="21" x2="28" y2="27" stroke="#0E3A78" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

const HousekeepingIcon: React.FC = () => (
  <svg viewBox="0 0 48 48" className="w-8 h-8 sm:w-9 sm:h-9" aria-hidden="true">
    {/* Vacuum body */}
    <path
      d="M11 33 C11 25 16 21 22 21 C26 21 29 24 29 30 V35 H11 Z"
      fill="none"
      stroke="#0E3A78"
      strokeWidth="2.8"
      strokeLinejoin="round"
    />
    <circle cx="24" cy="34" r="4" fill="#FFFFFF" stroke="#0E3A78" strokeWidth="2.6" />
    <circle cx="14" cy="36" r="2.2" fill="#0E3A78" />
    {/* Hose curving up to wand */}
    <path
      d="M21 21 C21 12 28 9 32 13 C35 16 35 23 35 34"
      fill="none"
      stroke="#0E3A78"
      strokeWidth="2.6"
      strokeLinecap="round"
    />
    {/* Floor nozzle */}
    <path d="M31 35 H40 L41 38 H30 Z" fill="#0E3A78" />
  </svg>
);

const LaundryIcon: React.FC = () => (
  <svg viewBox="0 0 48 48" className="w-8 h-8 sm:w-9 sm:h-9" aria-hidden="true">
    {/* Machine cabinet */}
    <rect x="11" y="8" width="26" height="32" rx="3.5" fill="#0E3A78" />
    {/* Top control panel */}
    <rect x="14" y="11" width="9" height="3" rx="1" fill="#FFFFFF" />
    <circle cx="28" cy="12.5" r="1.4" fill="#FFFFFF" />
    <circle cx="32.5" cy="12.5" r="1.4" fill="#FFFFFF" />
    <line x1="11" y1="17" x2="37" y2="17" stroke="#FFFFFF" strokeWidth="1.5" />
    {/* Washing drum */}
    <circle cx="24" cy="28" r="7.5" fill="#FFFFFF" />
    <circle cx="24" cy="28" r="5" fill="#0E3A78" />
    <path d="M19.5 28.5 Q22 26 24 28.5 T28.5 28.5" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const ElectricianIcon: React.FC = () => (
  <svg viewBox="0 0 48 48" className="w-8 h-8 sm:w-9 sm:h-9" aria-hidden="true">
    {/* Prongs */}
    <rect x="17.5" y="9" width="3.5" height="9" rx="1.6" fill="#0E3A78" />
    <rect x="27" y="9" width="3.5" height="9" rx="1.6" fill="#0E3A78" />
    {/* Plug body */}
    <path
      d="M14 17 H34 V23 C34 28.5 29.5 32.5 24 32.5 C18.5 32.5 14 28.5 14 23 Z"
      fill="#0E3A78"
    />
    {/* Cord */}
    <rect x="22" y="32" width="4" height="8" rx="1.5" fill="#0E3A78" />
    <path d="M24 38 V41" stroke="#0E3A78" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const PlumberIcon: React.FC = () => (
  <svg viewBox="0 0 48 48" className="w-8 h-8 sm:w-9 sm:h-9" aria-hidden="true">
    {/* Tap handle */}
    <rect x="17" y="10" width="14" height="3.5" rx="1.7" fill="#0E3A78" />
    <rect x="22.3" y="13" width="3.4" height="6" fill="#0E3A78" />
    {/* Faucet pipe body */}
    <path
      d="M9 20 H29 C34 20 37 23 37 28 V30 H31 V27.5 C31 26 30 25.5 28.5 25.5 H9 Z"
      fill="#0E3A78"
    />
    <rect x="8" y="18" width="4" height="9.5" rx="1" fill="#0E3A78" />
    {/* Water droplet */}
    <path
      d="M34 32.5 C34 32.5 30.5 36.8 30.5 38.8 C30.5 40.8 32.1 42.3 34 42.3 C35.9 42.3 37.5 40.8 37.5 38.8 C37.5 36.8 34 32.5 34 32.5 Z"
      fill="#0E3A78"
    />
  </svg>
);

const SERVICE_BADGES = [
  { id: 'maid', labelLines: ['Maid', 'Services'], icon: MaidServiceIcon },
  { id: 'cook', labelLines: ['Cook', 'Services'], icon: CookServiceIcon },
  { id: 'housekeeping', labelLines: ['Housekeeping'], icon: HousekeepingIcon },
  { id: 'laundry', labelLines: ['Laundry'], icon: LaundryIcon },
  { id: 'electrician', labelLines: ['Electrician'], icon: ElectricianIcon },
  { id: 'plumber', labelLines: ['Plumber'], icon: PlumberIcon },
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onExploreStay,
  onExploreServices,
}) => {
  const [activePage, setActivePage] = useState<number>(0);
  const [dragOffsetX, setDragOffsetX] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const gestureRef = useRef<{
    active: boolean;
    lockedHorizontal: boolean;
    startX: number;
    startY: number;
    startTime: number;
    lastX: number;
  }>({
    active: false,
    lockedHorizontal: false,
    startX: 0,
    startY: 0,
    startTime: 0,
    lastX: 0,
  });

  // Lock background page scroll while Welcome Screen is visible
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Keyboard arrow support for desktop / hardware keyboards
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setActivePage((p) => Math.min(TOTAL_PAGES - 1, p + 1));
      } else if (e.key === 'ArrowLeft') {
        setActivePage((p) => Math.max(0, p - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const beginGesture = useCallback((clientX: number, clientY: number) => {
    gestureRef.current = {
      active: true,
      lockedHorizontal: false,
      startX: clientX,
      startY: clientY,
      startTime: Date.now(),
      lastX: clientX,
    };
  }, []);

  const moveGesture = useCallback(
    (clientX: number, clientY: number) => {
      const g = gestureRef.current;
      if (!g.active) return;

      const dx = clientX - g.startX;
      const dy = clientY - g.startY;
      g.lastX = clientX;

      if (!g.lockedHorizontal) {
        if (Math.abs(dx) < DRAG_ACTIVATION_PX && Math.abs(dy) < DRAG_ACTIVATION_PX) {
          return;
        }
        if (Math.abs(dx) > Math.abs(dy)) {
          g.lockedHorizontal = true;
          setIsDragging(true);
        } else {
          // Vertical scroll gesture — release horizontal tracking
          g.active = false;
          return;
        }
      }

      // Rubber-band resistance at the outer boundaries
      const pullingPastStart = activePage === 0 && dx > 0;
      const pullingPastEnd = activePage === TOTAL_PAGES - 1 && dx < 0;
      const dampedDx = pullingPastStart || pullingPastEnd ? dx * 0.25 : dx;
      setDragOffsetX(dampedDx);
    },
    [activePage]
  );

  const endGesture = useCallback(() => {
    const g = gestureRef.current;
    if (!g.active) return;
    g.active = false;

    if (g.lockedHorizontal) {
      const dx = g.lastX - g.startX;
      const elapsed = Math.max(1, Date.now() - g.startTime);
      const velocity = Math.abs(dx) / elapsed;
      const shouldSwitch = Math.abs(dx) >= SWIPE_THRESHOLD_PX || (Math.abs(dx) >= 24 && velocity > 0.35);

      if (shouldSwitch) {
        if (dx < 0 && activePage < TOTAL_PAGES - 1) {
          setActivePage(activePage + 1);
        } else if (dx > 0 && activePage > 0) {
          setActivePage(activePage - 1);
        }
      }
    }

    setIsDragging(false);
    setDragOffsetX(0);
  }, [activePage]);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    beginGesture(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    moveGesture(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    endGesture();
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Allow interactive buttons to handle clicks natively without interference
    if ((e.target as HTMLElement).closest('button')) return;
    beginGesture(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!gestureRef.current.active) return;
    moveGesture(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    endGesture();
  };

  const renderPaginationDots = (pageIndex: number) => (
    <div
      className="flex items-center justify-center gap-2 pt-2 pb-1"
      role="tablist"
      aria-label="Welcome pages"
    >
      {[0, 1].map((idx) => {
        const isCurrent = pageIndex === idx;
        return (
          <button
            key={idx}
            type="button"
            role="tab"
            aria-selected={isCurrent}
            aria-label={`Welcome page ${idx + 1}`}
            data-testid={`welcome-dot-${idx}`}
            onClick={() => setActivePage(idx)}
            className={`rounded-full transition-all duration-200 cursor-pointer p-1.5 -m-1.5 flex items-center justify-center`}
          >
            <span
              className={`block rounded-full transition-all duration-200 ${
                isCurrent
                  ? 'w-2.5 h-2.5 bg-[#F36B16] scale-110'
                  : 'w-2 h-2 bg-[#BFC8D6] hover:bg-[#94A3B8]'
              }`}
            />
          </button>
        );
      })}
    </div>
  );

  return (
    <div
      data-testid="welcome-screen"
      className="fixed inset-0 z-[200] bg-[#EEF3FA] flex items-center justify-center overflow-hidden"
    >
      {/* Mobile-first full-bleed viewport container on Android phones, centered phone frame on wide screens */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="relative w-full max-w-[460px] h-[100dvh] bg-gradient-to-b from-[#FFFFFF] via-[#FBFDFE] to-[#F4F8FE] overflow-hidden shadow-2xl select-none touch-pan-y"
      >
        {/* Horizontal Swipeable Track */}
        <div
          data-testid="welcome-track"
          data-active-page={activePage}
          className={`flex w-full h-full will-change-transform ${
            isDragging ? '' : 'transition-transform duration-300 ease-out'
          }`}
          style={{
            transform: `translate3d(calc(${-activePage * 100}% + ${dragOffsetX}px), 0, 0)`,
          }}
        >
          {/* ==================== PAGE 1: FIND YOUR PERFECT STAY IN GONDIA ==================== */}
          <section
            data-testid="welcome-page-1"
            aria-label="Find Your Perfect Stay in Gondia"
            className="w-full h-full shrink-0 flex flex-col justify-between bg-gradient-to-b from-[#FFFFFF] via-[#FAFBFD] to-[#F3F7FD] overflow-hidden"
          >
            {/* Top Brand & Headline */}
            <div className="pt-[max(14px,env(safe-area-inset-top))] sm:pt-5 px-5 text-center shrink-0">
              <GondiaStayWelcomeLogo idPrefix="stay" />

              <h1 className="mt-2.5 sm:mt-3.5 text-[23px] sm:text-[26px] font-extrabold text-[#0B2C66] leading-[1.15] tracking-tight">
                Find Your Perfect Stay
              </h1>

              {/* Orange script "in Gondia" with curved brush underline */}
              <div className="relative inline-flex flex-col items-center -mt-0.5">
                <span
                  style={SCRIPT_FONT_STYLE}
                  className="text-[36px] sm:text-[42px] text-[#EC6912] leading-[1.08] tracking-normal pr-1"
                >
                  in Gondia
                </span>
                <svg
                  viewBox="0 0 180 12"
                  className="w-[142px] sm:w-[162px] h-auto -mt-1.5"
                  aria-hidden="true"
                >
                  <path
                    d="M8 9 Q90 0 172 6 Q92 6 8 9 Z"
                    fill="#F36B16"
                  />
                </svg>
              </div>

              <p className="mt-1 text-[13px] sm:text-[14.5px] font-bold text-[#1A2233] tracking-tight">
                Comfortable Homes. Peaceful Stay.
              </p>
            </div>

            {/* Hero Bedroom + Indian Thali Photo with Exact Sweeping Orange & White Arc */}
            <div className="relative w-full flex-1 min-h-[145px] max-h-[255px] mt-1.5 overflow-hidden">
              <svg
                viewBox="0 0 760 466"
                preserveAspectRatio="xMidYMid slice"
                className="w-full h-full block"
                role="img"
                aria-label="Furnished bedroom and traditional Indian thali meal in Gondia"
              >
                <defs>
                  <linearGradient id="stayTopFade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <image
                  href={WELCOME_ASSET_URL}
                  x="0"
                  y="-512"
                  width="1536"
                  height="1664"
                />
                {/* Soft top edge blend into subtitle */}
                <rect x="0" y="0" width="760" height="22" fill="url(#stayTopFade)" />
                {/* Crisp matching white bottom sweep + orange ribbon accent */}
                <path
                  d="M0 442 Q195 365 760 446 L760 466 L0 466 Z"
                  fill="#F6F9FE"
                />
                <path
                  d="M0 426 Q145 368 330 385 Q145 382 0 446 Z"
                  fill="#F36B16"
                />
              </svg>
            </div>

            {/* Lower Content: 3 Feature Cards + Orange CTA Button + Pagination Dots */}
            <div className="px-4 sm:px-5 pt-2 pb-0.5 shrink-0 flex flex-col items-center">
              {/* 3 Rounded Feature Cards */}
              <div className="w-full grid grid-cols-3 gap-2.5 sm:gap-3">
                <div className="bg-[#EAF1FB]/90 border border-[#DCE7F7] rounded-2xl py-2.5 sm:py-3 px-1.5 flex flex-col items-center justify-center text-center shadow-[0_2px_10px_rgba(14,58,120,0.06)]">
                  <RentalFlatsIcon />
                  <span className="mt-1 text-[12.5px] sm:text-[13.5px] font-extrabold text-[#0B2C66] leading-[1.18]">
                    Rental
                    <br />
                    Flats
                  </span>
                </div>

                <div className="bg-[#EAF1FB]/90 border border-[#DCE7F7] rounded-2xl py-2.5 sm:py-3 px-1.5 flex flex-col items-center justify-center text-center shadow-[0_2px_10px_rgba(14,58,120,0.06)]">
                  <RoomsPgIcon />
                  <span className="mt-1 text-[12.5px] sm:text-[13.5px] font-extrabold text-[#0B2C66] leading-[1.18]">
                    Rooms
                    <br />
                    &amp; PG
                  </span>
                </div>

                <div className="bg-[#EAF1FB]/90 border border-[#DCE7F7] rounded-2xl py-2.5 sm:py-3 px-1.5 flex flex-col items-center justify-center text-center shadow-[0_2px_10px_rgba(14,58,120,0.06)]">
                  <MessTiffinIcon />
                  <span className="mt-1 text-[12.5px] sm:text-[13.5px] font-extrabold text-[#0B2C66] leading-[1.18]">
                    Mess
                    <br />
                    Tiffin
                  </span>
                </div>
              </div>

              {/* Primary CTA Button: Explore GondiaStay */}
              <button
                type="button"
                data-testid="explore-gondiastay-btn"
                onClick={onExploreStay}
                className="mt-3.5 sm:mt-4 w-[92%] min-h-[48px] py-3 px-6 rounded-full bg-gradient-to-r from-[#FF811C] via-[#F76808] to-[#EA580C] hover:from-[#FF8C2B] hover:to-[#F0600F] active:scale-[0.98] text-white font-bold text-[15.5px] sm:text-[16.5px] shadow-[0_8px_18px_-3px_rgba(243,107,22,0.55)] transition-all flex items-center justify-center relative cursor-pointer"
              >
                <span>Explore GondiaStay</span>
                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5 absolute right-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
              </button>

              {renderPaginationDots(0)}
            </div>

            {/* Bottom Heritage Skyline & Tagline */}
            <WelcomeSkylineFooter variant="stay" />
          </section>

          {/* ==================== PAGE 2: TRUSTED HOME SERVICES IN GONDIA ==================== */}
          <section
            data-testid="welcome-page-2"
            aria-label="Trusted Home Services in Gondia"
            className="w-full h-full shrink-0 flex flex-col justify-between bg-gradient-to-b from-[#FFFFFF] via-[#FAFBFD] to-[#F3F7FD] overflow-hidden"
          >
            {/* Top Brand & Headline */}
            <div className="pt-[max(14px,env(safe-area-inset-top))] sm:pt-5 px-5 text-center shrink-0">
              <GondiaStayWelcomeLogo idPrefix="services" />

              <h1 className="mt-2.5 sm:mt-3.5 text-[23px] sm:text-[26px] font-extrabold text-[#0B2C66] leading-[1.15] tracking-tight">
                Trusted Home Services
              </h1>

              {/* Orange script "in Gondia" with curved brush underline */}
              <div className="relative inline-flex flex-col items-center -mt-0.5">
                <span
                  style={SCRIPT_FONT_STYLE}
                  className="text-[36px] sm:text-[42px] text-[#EC6912] leading-[1.08] tracking-normal pr-1"
                >
                  in Gondia
                </span>
                <svg
                  viewBox="0 0 180 12"
                  className="w-[142px] sm:w-[162px] h-auto -mt-1.5"
                  aria-hidden="true"
                >
                  <path
                    d="M8 9 Q90 0 172 6 Q92 6 8 9 Z"
                    fill="#F36B16"
                  />
                </svg>
              </div>

              <p className="mt-1 text-[13px] sm:text-[14.5px] font-bold text-[#1A2233] tracking-tight">
                Reliable Services. Hassle-Free Life.
              </p>
            </div>

            {/* Middle Split Hero: Left Technician Photo + Right 2x3 Service Circles + Bottom Sweeping Orange Curve */}
            <div className="relative w-full flex-1 min-h-[250px] max-h-[385px] mt-1 flex items-stretch overflow-hidden">
              {/* Left Side: Exact Smiling Service Technician with Toolbox */}
              <div className="relative w-[53%] h-full overflow-hidden shrink-0">
                <svg
                  viewBox="0 0 400 650"
                  preserveAspectRatio="xMidYMax slice"
                  className="w-full h-full block"
                  role="img"
                  aria-label="Friendly verified home service technician holding a toolbox"
                >
                  <defs>
                    <linearGradient id="techTopFade" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
                      <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="techRightFade" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#FAFCFF" stopOpacity="0" />
                      <stop offset="100%" stopColor="#FAFCFF" stopOpacity="1" />
                    </linearGradient>
                  </defs>
                  <image
                    href={WELCOME_ASSET_URL}
                    x="-776"
                    y="-516"
                    width="1536"
                    height="1664"
                  />
                  {/* Seamless feather on top and right edge */}
                  <rect x="0" y="0" width="400" height="36" fill="url(#techTopFade)" />
                  <rect x="358" y="0" width="42" height="650" fill="url(#techRightFade)" />
                </svg>
              </div>

              {/* Right Side: 2x3 Grid of Circular Home Service Badges */}
              <div className="relative z-10 w-[47%] h-full pr-2 sm:pr-3.5 pl-0.5 pt-1.5 pb-9 flex items-center">
                <div className="w-full grid grid-cols-2 gap-x-1.5 gap-y-2 sm:gap-x-2.5 sm:gap-y-2.5">
                  {SERVICE_BADGES.map((badge) => {
                    const IconComponent = badge.icon;
                    return (
                      <div
                        key={badge.id}
                        className="flex flex-col items-center justify-center text-center"
                      >
                        <div className="relative w-[70px] h-[70px] min-[380px]:w-[78px] min-[380px]:h-[78px] sm:w-[84px] sm:h-[84px] rounded-full bg-white/95 border-[2.5px] border-[#DCE7F6] shadow-[0_3px_12px_rgba(14,58,120,0.09)] flex flex-col items-center justify-center overflow-visible ring-1 ring-[#EDF3FB]">
                          <IconComponent />
                          <span className="mt-0.5 px-1 text-[9px] min-[380px]:text-[9.5px] sm:text-[10.5px] font-extrabold text-[#0B2C66] leading-[1.08] tracking-tight whitespace-nowrap bg-white/85 rounded-full">
                            {badge.labelLines.length === 2 ? (
                              <>
                                {badge.labelLines[0]}
                                <br />
                                {badge.labelLines[1]}
                              </>
                            ) : (
                              badge.labelLines[0]
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sweeping Orange + White Curved Arc across the bottom of the middle hero */}
              <svg
                viewBox="0 0 420 62"
                preserveAspectRatio="none"
                className="absolute bottom-0 left-0 w-full h-[34px] sm:h-[42px] pointer-events-none z-20"
                aria-hidden="true"
              >
                <path
                  d="M0 10 Q135 58 420 26 L420 62 L0 62 Z"
                  fill="#F6F9FE"
                />
                <path
                  d="M0 2 Q135 52 420 18 L420 31 Q135 64 0 22 Z"
                  fill="#F36B16"
                />
              </svg>
            </div>

            {/* Lower Content: Explore Home Services Button + Pagination Dots */}
            <div className="px-4 sm:px-5 pt-2 pb-0.5 shrink-0 flex flex-col items-center">
              <button
                type="button"
                data-testid="explore-home-services-btn"
                onClick={onExploreServices}
                className="w-[92%] min-h-[48px] py-3 px-6 rounded-full bg-gradient-to-r from-[#FF811C] via-[#F76808] to-[#EA580C] hover:from-[#FF8C2B] hover:to-[#F0600F] active:scale-[0.98] text-white font-bold text-[15.5px] sm:text-[16.5px] shadow-[0_8px_18px_-3px_rgba(243,107,22,0.55)] transition-all flex items-center justify-center relative cursor-pointer"
              >
                <span>Explore Home Services</span>
                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5 absolute right-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
              </button>

              {renderPaginationDots(1)}
            </div>

            {/* Bottom Heritage Skyline & Tagline */}
            <WelcomeSkylineFooter variant="services" />
          </section>
        </div>
      </div>
    </div>
  );
};
