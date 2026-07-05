// ============================================================================
// COLLECTIONS BARREL — Single import point for all catalog data
// ============================================================================
// Usage:  import { allCollections } from '../data/collections';
//
// Each collection file exports a typed `Category` object.
// This barrel gathers them into one sorted array.
// ============================================================================

// ── Karmen Collections ──
import { artCollection } from "./art";
import { bestCollection } from "./best";
import { cosmosCollection } from "./cosmos";
import { darkCollection } from "./dark";
import { decorCollection } from "./decor";
import { diamenteCollection } from "./diamente";
import { eleganceCollection } from "./elegance";
import { elitCollection } from "./elit";
import { etroCollection } from "./etro";
import { fontanaCollection } from "./fontana";
import { frescoCollection } from "./fresco";
import { iconCollection } from "./icon";
import { iconkidsCollection } from "./icon-kids";
import { idolCollection } from "./idol";
import { imperialluxeCollection } from "./imperial-luxe";
import { indigoCollection } from "./indigo";
import { jadeCollection } from "./jade";
import { kaftanCollection } from "./kaftan";
import { lendaCollection } from "./lenda";
import { leonCollection } from "./leon";
import { lookblackCollection } from "./look-black";
import { lookclassicCollection } from "./look-classic";
import { lookmodernCollection } from "./look-modern";
import { loopCollection } from "./loop";
import { lotusCollection } from "./lotus";
import { lotusplusCollection } from "./lotus-plus";
import { matrisCollection } from "./matris";
import { meritCollection } from "./merit";
import { posttouchCollection } from "./post-touch";
import { sumerCollection } from "./sumer";
import { tokyoCollection } from "./tokyo";
import { trendCollection } from "./trend";
import { truvaCollection } from "./truva";
import { viskonaCollection } from "./viskona";
import { vogueCollection } from "./vogue";
import { woolCollection } from "./wool";
import { zeenCollection } from "./zeen";
import { zenithCollection } from "./zenith";

// ── Saten Collections ──
import { armadaCollection } from "./armada";
import { armonyCollection } from "./armony";
import { crownCollection } from "./crown";
import { effectCollection } from "./effect";
import { farahCollection } from "./farah";
import { feelCollection } from "./feel";
import { fesaneCollection } from "./fesane";
import { loyaCollection } from "./loya";
import { marvelCollection } from "./marvel";
import { moonCollection } from "./moon";
import { nexusCollection } from "./nexus";
import { ottowaCollection } from "./ottowa";
import { pixelCollection } from "./pixel";
import { portoCollection } from "./porto";
import { quatroCollection } from "./quatro";
import { satensisalCollection } from "./saten-sisal";
import { scalaCollection } from "./scala";
import { silvaCollection } from "./silva";
import { solosCollection } from "./solos";
import { stepCollection } from "./step";
import { tabloCollection } from "./tablo";
import { tioraCollection } from "./tiora";
import { vistaCollection } from "./vista";
import { wonderCollection } from "./wonder";

import type { Category } from "../catalog";

/** Every collection in the catalog, sorted alphabetically by title. */
export const allCollections: Category[] = [
  // Karmen
  artCollection,
  bestCollection,
  cosmosCollection,
  darkCollection,
  decorCollection,
  diamenteCollection,
  eleganceCollection,
  elitCollection,
  etroCollection,
  fontanaCollection,
  frescoCollection,
  iconCollection,
  iconkidsCollection,
  idolCollection,
  imperialluxeCollection,
  indigoCollection,
  jadeCollection,
  kaftanCollection,
  lendaCollection,
  leonCollection,
  lookblackCollection,
  lookclassicCollection,
  lookmodernCollection,
  loopCollection,
  lotusCollection,
  lotusplusCollection,
  matrisCollection,
  meritCollection,
  posttouchCollection,
  sumerCollection,
  tokyoCollection,
  trendCollection,
  truvaCollection,
  viskonaCollection,
  vogueCollection,
  woolCollection,
  zeenCollection,
  zenithCollection,
  // Saten
  armadaCollection,
  armonyCollection,
  crownCollection,
  effectCollection,
  farahCollection,
  feelCollection,
  fesaneCollection,
  loyaCollection,
  marvelCollection,
  moonCollection,
  nexusCollection,
  ottowaCollection,
  pixelCollection,
  portoCollection,
  quatroCollection,
  satensisalCollection,
  scalaCollection,
  silvaCollection,
  solosCollection,
  stepCollection,
  tabloCollection,
  tioraCollection,
  vistaCollection,
  wonderCollection,
].sort((a, b) => a.title.localeCompare(b.title));
