/**
 * 실사진 매핑 — 사용자가 제공한 카테고리별 사진 팩(80장 중 선정)을
 * apps/web/public/images/zipservice/ 에 정적 파일로 저장하고 여기서 참조한다.
 * 여러 키가 같은 파일을 가리키는 경우(예: 이사 트럭 사진이 매거진 표지와
 * 업체 커버에도 쓰임)는 의도적인 재사용이다.
 */
const BASE = "/images/zipservice/";

export const PHOTOS = {
  mv_pack1: BASE + "mv-pack1.jpg",
  mv_pack2: BASE + "mv-pack2.jpg",
  mv_cart: BASE + "mv-cart.jpg",
  mv_sofa: BASE + "mv-sofa.jpg",
  mv_truck: BASE + "mv-truck.jpg",
  mv_box_room: BASE + "mv-box-room.jpg",
  mv_livingroom: BASE + "mv-livingroom.jpg",

  moc_window: BASE + "moc-window.jpg",
  moc_sink: BASE + "moc-sink.jpg",
  moc_toilet: BASE + "moc-toilet.jpg",
  moc_vacuum_room: BASE + "moc-vacuum-room.jpg",
  moc_bath_sink: BASE + "moc-bath-sink.jpg",
  moc_screen: BASE + "moc-screen.jpg",

  lc_vacuum: BASE + "lc-vacuum.jpg",
  lc_stove: BASE + "lc-stove.jpg",
  lc_sink: BASE + "lc-sink.jpg",
  lc_fridge: BASE + "lc-fridge.jpg",
  lc_curtain: BASE + "lc-curtain.jpg",
  lc_living: BASE + "lc-living.jpg",
  lc_table: BASE + "lc-table.jpg",

  ap_fridge_kitchen: BASE + "ap-fridge-kitchen.jpg",
  ap_washer: BASE + "ap-washer.jpg",
  ap_purifier: BASE + "ap-purifier.jpg",
  ap_fridge_carry: BASE + "ap-fridge-carry.jpg",

  fu_sofa: BASE + "fu-sofa.jpg",
  fu_table: BASE + "fu-table.jpg",
  fu_closet: BASE + "fu-closet.jpg",

  sb_wallpad: BASE + "sb-wallpad.jpg",
  sb_purifier_machine: BASE + "sb-purifier-machine.jpg",
  sb_filter_replace: BASE + "sb-filter-replace.jpg",
  sb_filter_cartridges: BASE + "sb-filter-cartridges.jpg",
  sb_phone_app: BASE + "sb-phone-app.jpg",

  bd_moving: BASE + "bd-moving.jpg",
  bd_cleaning_kit: BASE + "bd-cleaning-kit.jpg",
  bd_livingroom: BASE + "bd-livingroom.jpg",

  // 재사용(같은 파일)
  co_moving1_cover: BASE + "mv-truck.jpg",
  co_moving2_cover: BASE + "mv-pack1.jpg",
  co_moc1_cover: BASE + "moc-window.jpg",
  co_lc1_cover: BASE + "lc-vacuum.jpg",
  co_appliance1_cover: BASE + "ap-fridge-kitchen.jpg",
  co_furniture1_cover: BASE + "fu-sofa.jpg",
  co_subscription1_cover: BASE + "sb-wallpad.jpg",

  mag_moving: BASE + "mv-truck.jpg",
  mag_cleaning: BASE + "lc-living.jpg",
} as const;

export type PhotoKey = keyof typeof PHOTOS;
