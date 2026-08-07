import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Pressable,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import AsyncStorage from "@react-native-async-storage/async-storage";
// @ts-ignore
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import ViewShot from "react-native-view-shot";
import Animated, {
  FadeInDown,
  FadeIn,
  Layout,
} from "react-native-reanimated";
import {
  INITIAL_CONSIGNMENT_GROUPS,
  ConsignmentGroup,
  ConsignmentProduct,
  calculateSetor,
  calculateTerjual,
} from "@/src/mock";

const STORAGE_KEY = "@apk_jastip_bintang_snack_groups_v3";
const BRAND_KEY = "@apk_jastip_bintang_snack_brand_v1";
const DEFAULT_BRAND = "Bintang Snack";

// ============ MODERN COLOR THEME ============
const C = {
  bg: "#F8FAFC",           // slate-50
  surface: "#FFFFFF",
  surfaceAlt: "#F1F5F9",   // slate-100
  border: "#E2E8F0",       // slate-200
  borderStrong: "#CBD5E1",
  primary: "#0F172A",      // slate-900 (dark navy)
  primaryAlt: "#1E293B",   // slate-800
  accent: "#F59E0B",       // amber-500
  accentSoft: "#FEF3C7",   // amber-100
  accentDark: "#B45309",   // amber-700
  success: "#10B981",      // emerald-500
  successSoft: "#D1FAE5",  // emerald-100
  successDark: "#047857",  // emerald-700
  warning: "#EF4444",      // red-500 (for sisa)
  warningSoft: "#FEE2E2",  // red-100
  warningDark: "#B91C1C",
  info: "#3B82F6",         // blue-500 (for sebelum)
  infoSoft: "#DBEAFE",
  infoDark: "#1D4ED8",
  text: "#0F172A",
  textMuted: "#64748B",    // slate-500
  textFaint: "#94A3B8",    // slate-400
};

type Toast = { visible: boolean; message: string; type: "success" | "error" | "info" };

export default function App() {
  const insets = useSafeAreaInsets();
  const [groups, setGroups] = useState<ConsignmentGroup[]>(INITIAL_CONSIGNMENT_GROUPS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPenitipFilter, setSelectedPenitipFilter] = useState("Semua");
  const [activeTab, setActiveTab] = useState<"ledger" | "summary">("ledger");
  const [toast, setToast] = useState<Toast>({ visible: false, message: "", type: "info" });

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Brand editable
  const [brandName, setBrandName] = useState(DEFAULT_BRAND);
  const [brandModalVisible, setBrandModalVisible] = useState(false);
  const [brandDraft, setBrandDraft] = useState("");

  // Form Fields
  const [penitip, setPenitip] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [formProducts, setFormProducts] = useState<{
    id: string;
    itemName: string;
    hargaPokok: string;
    hargaJual: string;
    titip: string;
    sisa: string;
    photoSebelum: string;
    photoSisa: string;
  }[]>([]);

  // ViewShot refs untuk share sebagai gambar
  const shotRefs = useRef<Record<string, ViewShot | null>>({});

  useEffect(() => {
    loadSavedData();
  }, []);

  const showToast = (message: string, type: Toast["type"] = "info") => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: "", type: "info" }), 2600);
  };

  const loadSavedData = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) setGroups(JSON.parse(saved));
      const savedBrand = await AsyncStorage.getItem(BRAND_KEY);
      if (savedBrand) setBrandName(savedBrand);
    } catch (e) {
      console.error("Failed to load saved groups", e);
    }
  };

  const saveBrand = async () => {
    const trimmed = brandDraft.trim();
    if (!trimmed) {
      showToast("Nama brand tidak boleh kosong.", "error");
      return;
    }
    setBrandName(trimmed);
    try {
      await AsyncStorage.setItem(BRAND_KEY, trimmed);
    } catch (e) {
      console.error("Failed to save brand", e);
    }
    setBrandModalVisible(false);
    showToast("Brand diperbarui.", "success");
  };

  const openBrandEdit = () => {
    setBrandDraft(brandName);
    setBrandModalVisible(true);
  };

  const saveGroupsData = async (newGroups: ConsignmentGroup[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newGroups));
    } catch (e) {
      console.error("Failed to save groups", e);
    }
  };

  const penitipList = ["Semua", ...Array.from(new Set(groups.map((g) => g.penitip)))];

  const filteredGroups = groups
    .map((group) => {
      const matchesFilter = selectedPenitipFilter === "Semua" || group.penitip === selectedPenitipFilter;
      if (!matchesFilter) return null;
      const matchingProducts = group.products.filter(
        (p) =>
          p.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          group.penitip.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (searchQuery.trim() === "" || matchingProducts.length > 0) {
        return { ...group, products: searchQuery.trim() === "" ? group.products : matchingProducts };
      }
      return null;
    })
    .filter(Boolean) as ConsignmentGroup[];

  // ============ CAMERA CAPTURE ============
  const captureFromCamera = async (
    prodIndex: number,
    photoField: "photoSebelum" | "photoSisa"
  ) => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        if (!perm.canAskAgain) {
          showToast("Izin kamera ditolak. Buka pengaturan untuk mengaktifkan.", "error");
          Linking.openSettings();
          return;
        }
        showToast("Izin kamera diperlukan untuk mengambil foto.", "error");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setFormProducts((prev) =>
          prev.map((p, idx) => (idx === prodIndex ? { ...p, [photoField]: uri } : p))
        );
      }
    } catch (e) {
      console.error("Camera error", e);
      showToast("Gagal membuka kamera.", "error");
    }
  };

  const addProductRow = () => {
    setFormProducts((prev) => [
      ...prev,
      {
        id: "prod-" + Date.now() + Math.random(),
        itemName: "",
        hargaPokok: "",
        hargaJual: "",
        titip: "",
        sisa: "",
        photoSebelum: "",
        photoSisa: "",
      },
    ]);
  };

  const removeProductRow = (index: number) => {
    if (formProducts.length === 1) {
      showToast("Minimal harus ada 1 produk.", "error");
      return;
    }
    setFormProducts((prev) => prev.filter((_, idx) => idx !== index));
  };

  const openAddModal = () => {
    setEditingGroupId(null);
    setPenitip("");
    setWhatsapp("");
    setFormProducts([
      {
        id: "prod-" + Date.now(),
        itemName: "",
        hargaPokok: "",
        hargaJual: "",
        titip: "",
        sisa: "",
        photoSebelum: "",
        photoSisa: "",
      },
    ]);
    setModalVisible(true);
  };

  const openEditModal = (group: ConsignmentGroup) => {
    setEditingGroupId(group.id);
    setPenitip(group.penitip);
    setWhatsapp(group.whatsapp);
    setFormProducts(
      group.products.map((p) => ({
        id: p.id,
        itemName: p.itemName,
        hargaPokok: p.hargaPokok.toString(),
        hargaJual: p.hargaJual.toString(),
        titip: p.titip.toString(),
        sisa: p.sisa.toString(),
        photoSebelum: p.photoSebelum || "",
        photoSisa: p.photoSisa || "",
      }))
    );
    setModalVisible(true);
  };

  const handleSaveGroup = () => {
    if (!penitip.trim()) {
      showToast("Nama Penitip wajib diisi.", "error");
      return;
    }
    if (formProducts.length === 0) {
      showToast("Tambahkan minimal 1 item produk.", "error");
      return;
    }

    const validated: ConsignmentProduct[] = [];
    for (let i = 0; i < formProducts.length; i++) {
      const fp = formProducts[i];
      if (!fp.itemName.trim() || !fp.hargaPokok || !fp.hargaJual || !fp.titip || fp.sisa === "") {
        showToast(`Produk #${i + 1} belum lengkap diisi.`, "error");
        return;
      }
      const hp = parseFloat(fp.hargaPokok);
      const hj = parseFloat(fp.hargaJual);
      const t = parseInt(fp.titip, 10);
      const s = parseInt(fp.sisa, 10);
      if (isNaN(hp) || isNaN(hj) || isNaN(t) || isNaN(s)) {
        showToast(`Harga & jumlah produk #${i + 1} harus angka.`, "error");
        return;
      }
      if (t < 1) {
        showToast(`Jumlah titip produk #${i + 1} minimal 1.`, "error");
        return;
      }
      if (s > t) {
        showToast(`Sisa produk #${i + 1} tidak boleh > titip.`, "error");
        return;
      }
      validated.push({
        id: fp.id || "prod-" + Date.now() + i,
        itemName: fp.itemName.trim(),
        hargaPokok: hp,
        hargaJual: hj,
        titip: t,
        sisa: s,
        photoSebelum: fp.photoSebelum || undefined,
        photoSisa: fp.photoSisa || undefined,
      });
    }

    let updatedGroups: ConsignmentGroup[];
    if (editingGroupId) {
      updatedGroups = groups.map((g) =>
        g.id === editingGroupId
          ? { ...g, penitip: penitip.trim(), whatsapp: whatsapp.trim(), products: validated, updatedAt: new Date().toISOString() }
          : g
      );
    } else {
      updatedGroups = [
        {
          id: "group-" + Date.now(),
          penitip: penitip.trim(),
          whatsapp: whatsapp.trim(),
          products: validated,
          updatedAt: new Date().toISOString(),
        },
        ...groups,
      ];
    }

    setGroups(updatedGroups);
    saveGroupsData(updatedGroups);
    setModalVisible(false);
    showToast(editingGroupId ? "Data berhasil diperbarui" : "Penitipan berhasil ditambahkan", "success");
  };

  const confirmDeleteGroup = (groupId: string) => setConfirmDelete(groupId);

  const doDeleteGroup = () => {
    if (!confirmDelete) return;
    const updated = groups.filter((g) => g.id !== confirmDelete);
    setGroups(updated);
    saveGroupsData(updated);
    setConfirmDelete(null);
    showToast("Data penitip berhasil dihapus", "success");
  };

  const formatIDR = (val: number) => "Rp " + val.toLocaleString("id-ID");

  const normalizePhone = (phone: string) => {
    let p = phone.trim();
    if (p.startsWith("0")) p = "62" + p.slice(1);
    else if (p.startsWith("+")) p = p.slice(1);
    return p;
  };

  // ============ WHATSAPP: kirim rekap sebagai gambar attachment ============
  const shareRecapAsImage = async (groupId: string, isSingleItem: boolean = false) => {
    try {
      const key = isSingleItem ? `single-${groupId}` : `group-${groupId}`;
      const ref = shotRefs.current[key];
      if (!ref || !ref.capture) {
        showToast("Gagal menyiapkan gambar rekap.", "error");
        return;
      }
      const uri = await ref.capture();
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        showToast("Berbagi tidak tersedia di perangkat ini.", "error");
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        dialogTitle: "Kirim Rekap ke WhatsApp",
        UTI: "public.png",
      });
    } catch (e) {
      console.error("Share error", e);
      showToast("Gagal berbagi rekap.", "error");
    }
  };

  const shareWaText = (group: ConsignmentGroup, product?: ConsignmentProduct) => {
    const phone = normalizePhone(group.whatsapp);
    if (!phone) {
      showToast("Nomor WhatsApp penitip belum diisi.", "error");
      return;
    }

    let message: string;
    if (product) {
      const terjual = calculateTerjual(product.titip, product.sisa);
      const setor = calculateSetor(product);
      message =
        `Halo *${group.penitip}*, rekap item *${product.itemName}*:\n\n` +
        `• Titip: ${product.titip} pcs\n` +
        `• Sisa: ${product.sisa} pcs\n` +
        `• Terjual: ${terjual} pcs\n` +
        `• Harga Pokok: ${formatIDR(product.hargaPokok)}/pc\n` +
        `• *Setor: ${formatIDR(setor)}*\n\n` +
        `Foto bukti Sebelum & Sisa dikirim terpisah sebagai gambar.\n\nTerima kasih! 🙏`;
    } else {
      let total = 0;
      const items = group.products
        .map((p, i) => {
          const t = calculateTerjual(p.titip, p.sisa);
          const s = calculateSetor(p);
          total += s;
          return `${i + 1}. *${p.itemName}*\n   Titip: ${p.titip} | Sisa: ${p.sisa} | Terjual: ${t}\n   Setor: ${formatIDR(s)}`;
        })
        .join("\n\n");
      message =
        `Halo *${group.penitip}*, rekap titipan Jastip Bintang Snack:\n\n${items}\n\n💰 *TOTAL SETOR: ${formatIDR(total)}*\n\n` +
        `Foto bukti dikirim terpisah sebagai gambar.\n\nTerima kasih! 🙏`;
    }

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => showToast("Gagal membuka WhatsApp.", "error"));
  };

  const allProducts = groups.flatMap((g) => g.products);
  const grandTotalSetor = allProducts.reduce((acc, curr) => acc + calculateSetor(curr), 0);
  const grandTitip = allProducts.reduce((a, c) => a + c.titip, 0);
  const grandSisa = allProducts.reduce((a, c) => a + c.sisa, 0);

  // ============ RENDER PHOTO BADGE (Sebelum / Sisa) ============
  const PhotoBadge = ({
    uri,
    label,
    tone,
    onPress,
    size = 68,
    testID,
  }: {
    uri?: string;
    label: string;
    tone: "info" | "warning";
    onPress?: () => void;
    size?: number;
    testID?: string;
  }) => {
    const toneColor = tone === "info" ? C.info : C.warning;
    const toneSoft = tone === "info" ? C.infoSoft : C.warningSoft;
    return (
      <Pressable onPress={onPress} disabled={!onPress} testID={testID}>
        <View style={[styles.photoBadge, { width: size, height: size }]}>
          {uri ? (
            <Image source={{ uri }} style={styles.photoBadgeImg} contentFit="cover" />
          ) : (
            <View style={[styles.photoBadgePlaceholder, { backgroundColor: toneSoft }]}>
              <Ionicons name="camera" size={size * 0.32} color={toneColor} />
            </View>
          )}
          <View style={[styles.photoBadgeLabel, { backgroundColor: toneColor }]}>
            <Text style={styles.photoBadgeLabelText}>{label}</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]} testID="main-container">
      <StatusBar style="light" backgroundColor={C.primary} />

      {/* ============ HEADER ============ */}
      <View style={styles.header} testID="app-header">
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <TouchableOpacity
              onPress={openBrandEdit}
              activeOpacity={0.7}
              style={styles.brandTouchable}
              testID="brand-edit-btn"
            >
              <Text style={styles.headerBrand} numberOfLines={1} adjustsFontSizeToFit>
                {brandName}
              </Text>
              <Ionicons name="pencil" size={11} color={C.accent} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Rekap</Text>
          </View>
          <TouchableOpacity
            style={styles.headerAddBtn}
            onPress={openAddModal}
            activeOpacity={0.85}
            testID="add-item-header-btn"
          >
            <Ionicons name="add" size={18} color={C.primary} />
            <Text style={styles.headerAddBtnText}>Penitip</Text>
          </TouchableOpacity>
        </View>

        {/* Summary strip inside header */}
        <View style={styles.headerStats}>
          <View style={styles.headerStatItem}>
            <Text style={styles.headerStatLabel}>Total Setor</Text>
            <Text style={styles.headerStatValue} numberOfLines={1} adjustsFontSizeToFit>
              {formatIDR(grandTotalSetor)}
            </Text>
          </View>
          <View style={styles.headerStatDivider} />
          <View style={styles.headerStatItem}>
            <Text style={styles.headerStatLabel}>Titip</Text>
            <Text style={styles.headerStatValueSm}>{grandTitip}</Text>
          </View>
          <View style={styles.headerStatDivider} />
          <View style={styles.headerStatItem}>
            <Text style={styles.headerStatLabel}>Sisa</Text>
            <Text style={[styles.headerStatValueSm, { color: C.accent }]}>{grandSisa}</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "ledger" && styles.tabBtnActive]}
            onPress={() => setActiveTab("ledger")}
            testID="tab-ledger"
          >
            <Ionicons name="list-outline" size={15} color={activeTab === "ledger" ? C.primary : "#94A3B8"} />
            <Text style={[styles.tabText, activeTab === "ledger" && styles.tabTextActive]}>Daftar Barang</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "summary" && styles.tabBtnActive]}
            onPress={() => setActiveTab("summary")}
            testID="tab-summary"
          >
            <Ionicons name="wallet-outline" size={15} color={activeTab === "summary" ? C.primary : "#94A3B8"} />
            <Text style={[styles.tabText, activeTab === "summary" && styles.tabTextActive]}>Rekap Setoran</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ============ MAIN CONTENT ============ */}
      {activeTab === "ledger" ? (
        <View style={styles.contentContainer} testID="ledger-view">
          {/* Search & Filter */}
          <View style={styles.filterSection}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={16} color={C.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Cari penitip atau nama item..."
                placeholderTextColor={C.textFaint}
                value={searchQuery}
                onChangeText={setSearchQuery}
                testID="search-input"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")} testID="clear-search">
                  <Ionicons name="close-circle" size={18} color={C.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsScroll}
              style={styles.chipsContainer}
              testID="penitip-filter-chips"
            >
              {penitipList.map((p) => {
                const selected = selectedPenitipFilter === p;
                return (
                  <TouchableOpacity
                    key={p}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setSelectedPenitipFilter(p)}
                    activeOpacity={0.7}
                    testID={`chip-penitip-${p.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{p}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <ScrollView
            style={styles.listScroll}
            contentContainerStyle={[styles.listContent, { paddingBottom: 96 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
            testID="consignment-groups-list"
          >
            {filteredGroups.length === 0 ? (
              <Animated.View entering={FadeIn.duration(300)} style={styles.emptyContainer} testID="empty-state">
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="basket-outline" size={44} color={C.accent} />
                </View>
                <Text style={styles.emptyTitle}>Belum ada data titipan</Text>
                <Text style={styles.emptySubtitle}>
                  Tekan tombol &quot;Penitip&quot; di kanan atas untuk mulai mencatat.
                </Text>
              </Animated.View>
            ) : (
              filteredGroups.map((group, gi) => {
                const groupTotalSetor = group.products.reduce((a, c) => a + calculateSetor(c), 0);
                return (
                  <Animated.View
                    key={group.id}
                    entering={FadeInDown.delay(gi * 60).duration(320)}
                    layout={Layout.springify()}
                    style={styles.groupCard}
                    testID={`group-card-${gi}`}
                  >
                    {/* Card top: consignor */}
                    <View style={styles.groupTop}>
                      <View style={styles.avatarLg}>
                        <Text style={styles.avatarLgText}>{group.penitip.charAt(0).toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.groupName} numberOfLines={1}>{group.penitip}</Text>
                        <View style={styles.groupMetaRow}>
                          <Ionicons name="cube-outline" size={11} color={C.textMuted} />
                          <Text style={styles.groupMetaText}>{group.products.length} item</Text>
                          <Text style={styles.groupMetaDot}>•</Text>
                          <Ionicons name="logo-whatsapp" size={11} color={C.success} />
                          <Text style={styles.groupMetaText} numberOfLines={1}>
                            {group.whatsapp || "belum ada"}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.iconBtnRow}>
                        <TouchableOpacity
                          style={styles.iconBtn}
                          onPress={() => openEditModal(group)}
                          testID={`edit-group-${group.id}`}
                        >
                          <Ionicons name="pencil-outline" size={15} color={C.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.iconBtn, { backgroundColor: C.warningSoft }]}
                          onPress={() => confirmDeleteGroup(group.id)}
                          testID={`delete-group-${group.id}`}
                        >
                          <Ionicons name="trash-outline" size={15} color={C.warningDark} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Hidden ViewShot for group share */}
                    <ViewShot
                      ref={(r) => { shotRefs.current[`group-${group.id}`] = r; }}
                      options={{ format: "png", quality: 0.95 }}
                      style={styles.shotHidden}
                    >
                      <RecapShotCard group={group} formatIDR={formatIDR} brandName={brandName} />
                    </ViewShot>

                    {/* Products list */}
                    <View style={styles.groupProducts}>
                      {group.products.map((prod, pi) => {
                        const terjual = calculateTerjual(prod.titip, prod.sisa);
                        const setor = calculateSetor(prod);
                        return (
                          <View
                            key={prod.id}
                            style={[styles.prodRow, pi < group.products.length - 1 && styles.prodRowDivider]}
                            testID={`product-row-${group.id}-${pi}`}
                          >
                            <View style={styles.prodHead}>
                              <View style={{ flex: 1, paddingRight: 8 }}>
                                <Text style={styles.prodName} numberOfLines={2}>{prod.itemName}</Text>
                                <View style={styles.prodPriceRow}>
                                  <Text style={styles.prodPriceLabel}>
                                    Pokok <Text style={styles.prodPriceBold}>{formatIDR(prod.hargaPokok)}</Text>
                                  </Text>
                                  <View style={styles.dot} />
                                  <Text style={styles.prodPriceLabel}>
                                    Jual <Text style={[styles.prodPriceBold, { color: C.success }]}>{formatIDR(prod.hargaJual)}</Text>
                                  </Text>
                                </View>
                              </View>
                            </View>

                            {/* Photo evidence: Sebelum + Sisa */}
                            <View style={styles.photoRow}>
                              <PhotoBadge
                                uri={prod.photoSebelum}
                                label="Sebelum"
                                tone="info"
                                size={72}
                                testID={`photo-sebelum-${prod.id}`}
                              />
                              <PhotoBadge
                                uri={prod.photoSisa}
                                label="Sisa"
                                tone="warning"
                                size={72}
                                testID={`photo-sisa-${prod.id}`}
                              />
                              <View style={styles.metricStack}>
                                <View style={styles.metricRow}>
                                  <View style={[styles.metricPill, { backgroundColor: C.infoSoft }]}>
                                    <Text style={[styles.metricPillLabel, { color: C.infoDark }]}>Titip</Text>
                                    <Text style={[styles.metricPillVal, { color: C.infoDark }]}>{prod.titip}</Text>
                                  </View>
                                  <View style={[styles.metricPill, { backgroundColor: C.warningSoft }]}>
                                    <Text style={[styles.metricPillLabel, { color: C.warningDark }]}>Sisa</Text>
                                    <Text style={[styles.metricPillVal, { color: C.warningDark }]}>{prod.sisa}</Text>
                                  </View>
                                </View>
                                <View style={styles.metricRow}>
                                  <View style={[styles.metricPill, { backgroundColor: C.successSoft }]}>
                                    <Text style={[styles.metricPillLabel, { color: C.successDark }]}>Terjual</Text>
                                    <Text style={[styles.metricPillVal, { color: C.successDark }]}>{terjual}</Text>
                                  </View>
                                </View>
                              </View>
                            </View>

                            <View style={styles.setorBar}>
                              <Text style={styles.setorLabel}>Setor Item</Text>
                              <Text style={styles.setorAmount}>{formatIDR(setor)}</Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>

                    {/* Group footer */}
                    <View style={styles.groupFooter}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.groupFooterLabel}>Total setor {group.penitip}</Text>
                        <Text style={styles.groupFooterAmount}>{formatIDR(groupTotalSetor)}</Text>
                      </View>
                      <View style={styles.groupFooterActions}>
                        <TouchableOpacity
                          style={styles.waTextBtn}
                          onPress={() => shareWaText(group)}
                          testID={`share-group-text-${group.id}`}
                        >
                          <Ionicons name="chatbubble-ellipses" size={14} color={C.success} />
                          <Text style={styles.waTextBtnText}>Teks</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.waImgBtn}
                          onPress={() => shareRecapAsImage(group.id, false)}
                          testID={`share-group-all-${group.id}`}
                        >
                          <Ionicons name="image" size={14} color="#FFF" />
                          <Text style={styles.waImgBtnText}>Kirim Foto Rekap</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Animated.View>
                );
              })
            )}
          </ScrollView>

          {/* Floating add button */}
          <TouchableOpacity
            style={[styles.fab, { bottom: 20 + insets.bottom }]}
            onPress={openAddModal}
            activeOpacity={0.85}
            testID="floating-add-btn"
          >
            <Ionicons name="add" size={26} color="#FFF" />
          </TouchableOpacity>
        </View>
      ) : (
        // ============ SUMMARY TAB ============
        <ScrollView
          style={styles.contentContainer}
          contentContainerStyle={[styles.recapContent, { paddingBottom: 40 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          testID="recap-view"
        >
          <Animated.View entering={FadeIn.duration(300)} style={styles.recapBanner}>
            <View style={styles.recapBannerIcon}>
              <Ionicons name="receipt-outline" size={24} color={C.accent} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.recapBannerTitle}>Rekapitulasi Setoran</Text>
              <Text style={styles.recapBannerSub}>
                Kirim rekap lengkap beserta foto bukti Sebelum & Sisa ke WhatsApp penitip.
              </Text>
            </View>
          </Animated.View>

          {groups.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="wallet-outline" size={44} color={C.accent} />
              </View>
              <Text style={styles.emptyTitle}>Belum ada rekap</Text>
            </View>
          ) : (
            groups.map((g, idx) => {
              const gTotal = g.products.reduce((a, c) => a + calculateSetor(c), 0);
              return (
                <Animated.View
                  key={g.id}
                  entering={FadeInDown.delay(idx * 60).duration(320)}
                  style={styles.recapCard}
                  testID={`consignor-card-${idx}`}
                >
                  <View style={styles.recapCardTop}>
                    <View style={styles.avatarLg}>
                      <Text style={styles.avatarLgText}>{g.penitip.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.groupName}>{g.penitip}</Text>
                      <Text style={styles.groupMetaText}>{g.products.length} item • WA: {g.whatsapp || "-"}</Text>
                    </View>
                    <View style={styles.recapTotalBadge}>
                      <Text style={styles.recapTotalLabel}>Setor</Text>
                      <Text style={styles.recapTotalVal} numberOfLines={1} adjustsFontSizeToFit>
                        {formatIDR(gTotal)}
                      </Text>
                    </View>
                  </View>

                  {/* Hidden shot for summary tab share */}
                  <ViewShot
                    ref={(r) => { shotRefs.current[`group-summary-${g.id}`] = r; }}
                    options={{ format: "png", quality: 0.95 }}
                    style={styles.shotHidden}
                  >
                    <RecapShotCard group={g} formatIDR={formatIDR} brandName={brandName} />
                  </ViewShot>

                  <View style={styles.recapItems}>
                    {g.products.map((it) => {
                      const t = calculateTerjual(it.titip, it.sisa);
                      const s = calculateSetor(it);
                      return (
                        <View key={it.id} style={styles.recapItemRow}>
                          <View style={styles.recapItemPhotos}>
                            <PhotoBadge uri={it.photoSebelum} label="Sblm" tone="info" size={44} />
                            <PhotoBadge uri={it.photoSisa} label="Sisa" tone="warning" size={44} />
                          </View>
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={styles.recapItemName} numberOfLines={1}>{it.itemName}</Text>
                            <Text style={styles.recapItemMeta}>
                              T:{it.titip} • S:{it.sisa} • J:{t}
                            </Text>
                          </View>
                          <Text style={styles.recapItemSetor} numberOfLines={1}>{formatIDR(s)}</Text>
                        </View>
                      );
                    })}
                  </View>

                  <View style={styles.recapActions}>
                    <TouchableOpacity
                      style={styles.waTextBtnBig}
                      onPress={() => shareWaText(g)}
                      testID={`recap-share-text-${g.id}`}
                    >
                      <Ionicons name="logo-whatsapp" size={15} color={C.success} />
                      <Text style={styles.waTextBtnBigText}>Kirim Teks WA</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.waImgBtnBig}
                      onPress={async () => {
                        const ref = shotRefs.current[`group-summary-${g.id}`];
                        if (!ref || !ref.capture) return;
                        try {
                          const uri = await ref.capture();
                          const ok = await Sharing.isAvailableAsync();
                          if (!ok) { showToast("Berbagi tidak tersedia.", "error"); return; }
                          await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Kirim rekap" });
                        } catch {
                          showToast("Gagal berbagi rekap.", "error");
                        }
                      }}
                      testID={`recap-share-all-${g.id}`}
                    >
                      <Ionicons name="image" size={15} color="#FFF" />
                      <Text style={styles.waImgBtnBigText}>Kirim Foto Rekap</Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* ============ MODAL: ADD/EDIT ============ */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1, justifyContent: "flex-end" }}
          >
            <View style={[styles.modalContainer, { paddingBottom: insets.bottom + 8 }]} testID="item-form-modal">
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingGroupId ? "Edit Titipan" : "Tambah Penitip"}
                </Text>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={styles.modalCloseBtn}
                  testID="close-modal-btn"
                >
                  <Ionicons name="close" size={20} color={C.primary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                contentContainerStyle={styles.modalScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nama Penitip</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Sari Ekawati"
                    placeholderTextColor={C.textFaint}
                    value={penitip}
                    onChangeText={setPenitip}
                    testID="input-penitip"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nomor WhatsApp</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="081234567890"
                    placeholderTextColor={C.textFaint}
                    keyboardType="phone-pad"
                    value={whatsapp}
                    onChangeText={setWhatsapp}
                    testID="input-whatsapp"
                  />
                </View>

                <View style={styles.modalSectionHeader}>
                  <Text style={styles.modalSectionTitle}>
                    Produk Titipan ({formProducts.length})
                  </Text>
                  <TouchableOpacity
                    style={styles.addRowBtn}
                    onPress={addProductRow}
                    testID="add-product-row-btn"
                  >
                    <Ionicons name="add" size={14} color={C.accent} />
                    <Text style={styles.addRowBtnText}>Tambah</Text>
                  </TouchableOpacity>
                </View>

                {formProducts.map((fp, index) => (
                  <Animated.View
                    key={fp.id || index}
                    entering={FadeInDown.duration(220)}
                    style={styles.formCard}
                    testID={`form-product-card-${index}`}
                  >
                    <View style={styles.formCardHeader}>
                      <View style={styles.formCardTitleWrap}>
                        <View style={styles.formCardNo}>
                          <Text style={styles.formCardNoText}>{index + 1}</Text>
                        </View>
                        <Text style={styles.formCardTitle}>Produk #{index + 1}</Text>
                      </View>
                      {formProducts.length > 1 && (
                        <TouchableOpacity
                          onPress={() => removeProductRow(index)}
                          style={styles.removeBtn}
                          testID={`remove-prod-row-${index}`}
                        >
                          <Ionicons name="trash-outline" size={15} color={C.warningDark} />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* ===== 2 Photo capture: Sebelum & Sisa ===== */}
                    <Text style={styles.inputLabel}>Foto Bukti (dari Kamera)</Text>
                    <View style={styles.photoCaptureRow}>
                      <TouchableOpacity
                        style={styles.photoCaptureBox}
                        onPress={() => captureFromCamera(index, "photoSebelum")}
                        testID={`capture-sebelum-${index}`}
                        activeOpacity={0.8}
                      >
                        {fp.photoSebelum ? (
                          <Image source={{ uri: fp.photoSebelum }} style={styles.photoCaptureImg} contentFit="cover" />
                        ) : (
                          <View style={[styles.photoCapturePlaceholder, { backgroundColor: C.infoSoft }]}>
                            <Ionicons name="camera" size={26} color={C.info} />
                            <Text style={[styles.photoCaptureHint, { color: C.infoDark }]}>Foto</Text>
                          </View>
                        )}
                        <View style={[styles.photoCaptureTag, { backgroundColor: C.info }]}>
                          <Ionicons name="cube" size={9} color="#FFF" />
                          <Text style={styles.photoCaptureTagText}>Sebelum</Text>
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.photoCaptureBox}
                        onPress={() => captureFromCamera(index, "photoSisa")}
                        testID={`capture-sisa-${index}`}
                        activeOpacity={0.8}
                      >
                        {fp.photoSisa ? (
                          <Image source={{ uri: fp.photoSisa }} style={styles.photoCaptureImg} contentFit="cover" />
                        ) : (
                          <View style={[styles.photoCapturePlaceholder, { backgroundColor: C.warningSoft }]}>
                            <Ionicons name="camera" size={26} color={C.warning} />
                            <Text style={[styles.photoCaptureHint, { color: C.warningDark }]}>Foto</Text>
                          </View>
                        )}
                        <View style={[styles.photoCaptureTag, { backgroundColor: C.warning }]}>
                          <Ionicons name="alert-circle" size={9} color="#FFF" />
                          <Text style={styles.photoCaptureTagText}>Sisa</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.captureHint}>
                      Ambil foto barang saat setor (Sebelum) & foto barang yang tersisa (Sisa).
                    </Text>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputSubLabel}>Nama Item</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Nasi, Sate, Gorengan..."
                        placeholderTextColor={C.textFaint}
                        value={fp.itemName}
                        onChangeText={(v) => setFormProducts((prev) => prev.map((p, i) => (i === index ? { ...p, itemName: v } : p)))}
                        testID={`input-item-name-${index}`}
                      />
                    </View>

                    <View style={styles.rowInputs}>
                      <View style={[styles.inputGroup, { flex: 1, marginRight: 6 }]}>
                        <Text style={styles.inputSubLabel}>Harga Pokok</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="0"
                          placeholderTextColor={C.textFaint}
                          keyboardType="numeric"
                          value={fp.hargaPokok}
                          onChangeText={(v) => setFormProducts((prev) => prev.map((p, i) => (i === index ? { ...p, hargaPokok: v } : p)))}
                          testID={`input-harga-pokok-${index}`}
                        />
                      </View>
                      <View style={[styles.inputGroup, { flex: 1, marginLeft: 6 }]}>
                        <Text style={styles.inputSubLabel}>Harga Jual</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="0"
                          placeholderTextColor={C.textFaint}
                          keyboardType="numeric"
                          value={fp.hargaJual}
                          onChangeText={(v) => setFormProducts((prev) => prev.map((p, i) => (i === index ? { ...p, hargaJual: v } : p)))}
                          testID={`input-harga-jual-${index}`}
                        />
                      </View>
                    </View>

                    <View style={styles.rowInputs}>
                      <View style={[styles.inputGroup, { flex: 1, marginRight: 6 }]}>
                        <Text style={styles.inputSubLabel}>Titip (pcs)</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="0"
                          placeholderTextColor={C.textFaint}
                          keyboardType="numeric"
                          value={fp.titip}
                          onChangeText={(v) => setFormProducts((prev) => prev.map((p, i) => (i === index ? { ...p, titip: v } : p)))}
                          testID={`input-titip-${index}`}
                        />
                      </View>
                      <View style={[styles.inputGroup, { flex: 1, marginLeft: 6 }]}>
                        <Text style={styles.inputSubLabel}>Sisa (pcs)</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="0"
                          placeholderTextColor={C.textFaint}
                          keyboardType="numeric"
                          value={fp.sisa}
                          onChangeText={(v) => setFormProducts((prev) => prev.map((p, i) => (i === index ? { ...p, sisa: v } : p)))}
                          testID={`input-sisa-${index}`}
                        />
                      </View>
                    </View>

                    <View style={styles.livePreview}>
                      <View style={styles.livePreviewItem}>
                        <Text style={styles.livePreviewLabel}>Terjual</Text>
                        <Text style={styles.livePreviewVal}>
                          {Math.max(0, (parseInt(fp.titip, 10) || 0) - (parseInt(fp.sisa, 10) || 0))} pcs
                        </Text>
                      </View>
                      <View style={styles.livePreviewDivider} />
                      <View style={styles.livePreviewItem}>
                        <Text style={styles.livePreviewLabel}>Setor</Text>
                        <Text style={[styles.livePreviewVal, { color: C.accent }]}>
                          {formatIDR(Math.max(0, (parseInt(fp.titip, 10) || 0) - (parseInt(fp.sisa, 10) || 0)) * (parseFloat(fp.hargaPokok) || 0))}
                        </Text>
                      </View>
                    </View>
                  </Animated.View>
                ))}

                <TouchableOpacity
                  style={styles.addMoreBtn}
                  onPress={addProductRow}
                  testID="add-more-bottom-btn"
                >
                  <Ionicons name="add-circle-outline" size={18} color={C.accent} />
                  <Text style={styles.addMoreBtnText}>Tambah Item Lainnya</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveGroup}
                  testID="submit-item-btn"
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                  <Text style={styles.saveBtnText}>
                    {editingGroupId ? "Simpan Perubahan" : "Simpan Titipan"}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ============ BRAND EDIT MODAL ============ */}
      <Modal
        transparent
        visible={brandModalVisible}
        animationType="fade"
        onRequestClose={() => setBrandModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.confirmOverlay}
        >
          <Animated.View entering={FadeIn.duration(200)} style={styles.brandModalBox} testID="brand-edit-modal">
            <View style={[styles.emptyIconWrap, { backgroundColor: C.primaryAlt }]}>
              <Ionicons name="sparkles" size={24} color={C.accent} />
            </View>
            <Text style={styles.confirmTitle}>Nama Brand</Text>
            <Text style={styles.confirmMsg}>
              Ubah nama brand yang tampil di header. Bebas — bikin sesuka kamu.
            </Text>
            <TextInput
              style={[styles.textInput, { width: "100%", marginBottom: 16 }]}
              placeholder={DEFAULT_BRAND}
              placeholderTextColor={C.textFaint}
              value={brandDraft}
              onChangeText={setBrandDraft}
              maxLength={40}
              autoFocus
              testID="brand-input"
            />
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmCancel}
                onPress={() => setBrandModalVisible(false)}
                testID="brand-cancel"
              >
                <Text style={styles.confirmCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmDelete, { backgroundColor: C.primary }]}
                onPress={saveBrand}
                testID="brand-save"
              >
                <Text style={styles.confirmDeleteText}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ============ CONFIRM DELETE MODAL ============ */}
      <Modal transparent visible={!!confirmDelete} animationType="fade" onRequestClose={() => setConfirmDelete(null)}>
        <View style={styles.confirmOverlay}>
          <Animated.View entering={FadeIn.duration(200)} style={styles.confirmBox} testID="delete-confirm-modal">
            <View style={[styles.emptyIconWrap, { backgroundColor: C.warningSoft }]}>
              <Ionicons name="trash-outline" size={26} color={C.warningDark} />
            </View>
            <Text style={styles.confirmTitle}>Hapus penitipan?</Text>
            <Text style={styles.confirmMsg}>Semua item dari penitip ini akan dihapus.</Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmCancel}
                onPress={() => setConfirmDelete(null)}
                testID="delete-cancel"
              >
                <Text style={styles.confirmCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDelete}
                onPress={doDeleteGroup}
                testID="delete-confirm"
              >
                <Text style={styles.confirmDeleteText}>Hapus</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* ============ TOAST ============ */}
      {toast.visible && (
        <Animated.View
          entering={FadeInDown.duration(200)}
          style={[
            styles.toast,
            { bottom: 100 + insets.bottom },
            toast.type === "success" && { backgroundColor: C.successDark },
            toast.type === "error" && { backgroundColor: C.warningDark },
          ]}
          testID="toast"
        >
          <Ionicons
            name={toast.type === "success" ? "checkmark-circle" : toast.type === "error" ? "alert-circle" : "information-circle"}
            size={18}
            color="#FFF"
          />
          <Text style={styles.toastText}>{toast.message}</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

// ============ Composite Recap Card (rendered offscreen for ViewShot capture) ============
function RecapShotCard({
  group,
  formatIDR,
  brandName,
}: {
  group: ConsignmentGroup;
  formatIDR: (v: number) => string;
  brandName: string;
}) {
  const total = group.products.reduce((a, c) => a + calculateSetor(c), 0);
  return (
    <View style={shotStyles.container}>
      <View style={shotStyles.header}>
        <Text style={shotStyles.brand}>{brandName.toUpperCase()}</Text>
        <Text style={shotStyles.title}>Rekap Titipan</Text>
      </View>
      <View style={shotStyles.penitipRow}>
        <View style={shotStyles.avatar}>
          <Text style={shotStyles.avatarText}>{group.penitip.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={shotStyles.penitipName}>{group.penitip}</Text>
          <Text style={shotStyles.penitipMeta}>
            {group.products.length} item • {group.whatsapp || "-"}
          </Text>
        </View>
      </View>

      {group.products.map((p) => {
        const terjual = calculateTerjual(p.titip, p.sisa);
        const setor = calculateSetor(p);
        return (
          <View key={p.id} style={shotStyles.item}>
            <Text style={shotStyles.itemName}>{p.itemName}</Text>

            <View style={shotStyles.photoRow}>
              <View style={shotStyles.photoWrap}>
                {p.photoSebelum ? (
                  <Image source={{ uri: p.photoSebelum }} style={shotStyles.photo} contentFit="cover" />
                ) : (
                  <View style={[shotStyles.photo, shotStyles.photoPh]}>
                    <Text style={shotStyles.photoPhText}>Tidak ada foto</Text>
                  </View>
                )}
                <View style={[shotStyles.photoTag, { backgroundColor: "#3B82F6" }]}>
                  <Text style={shotStyles.photoTagText}>SEBELUM</Text>
                </View>
              </View>
              <View style={shotStyles.photoWrap}>
                {p.photoSisa ? (
                  <Image source={{ uri: p.photoSisa }} style={shotStyles.photo} contentFit="cover" />
                ) : (
                  <View style={[shotStyles.photo, shotStyles.photoPh]}>
                    <Text style={shotStyles.photoPhText}>Tidak ada foto</Text>
                  </View>
                )}
                <View style={[shotStyles.photoTag, { backgroundColor: "#EF4444" }]}>
                  <Text style={shotStyles.photoTagText}>SISA</Text>
                </View>
              </View>
            </View>

            <View style={shotStyles.grid}>
              <View style={shotStyles.gridCell}>
                <Text style={shotStyles.gridLabel}>Titip</Text>
                <Text style={shotStyles.gridVal}>{p.titip}</Text>
              </View>
              <View style={shotStyles.gridCell}>
                <Text style={shotStyles.gridLabel}>Sisa</Text>
                <Text style={[shotStyles.gridVal, { color: "#B91C1C" }]}>{p.sisa}</Text>
              </View>
              <View style={shotStyles.gridCell}>
                <Text style={shotStyles.gridLabel}>Terjual</Text>
                <Text style={[shotStyles.gridVal, { color: "#047857" }]}>{terjual}</Text>
              </View>
            </View>

            <View style={shotStyles.priceRow}>
              <Text style={shotStyles.priceLabel}>Harga Pokok: {formatIDR(p.hargaPokok)}/pc</Text>
              <Text style={shotStyles.priceLabel}>Harga Jual: {formatIDR(p.hargaJual)}/pc</Text>
            </View>

            <View style={shotStyles.setorBox}>
              <Text style={shotStyles.setorLabel}>Setor Item</Text>
              <Text style={shotStyles.setorVal}>{formatIDR(setor)}</Text>
            </View>
          </View>
        );
      })}

      <View style={shotStyles.total}>
        <Text style={shotStyles.totalLabel}>TOTAL SETOR</Text>
        <Text style={shotStyles.totalVal}>{formatIDR(total)}</Text>
      </View>
      <Text style={shotStyles.footer}>Terima kasih atas kepercayaannya 🙏</Text>
    </View>
  );
}

// ============ STYLES ============
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.primary },

  // Header
  header: {
    backgroundColor: C.primary,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  brandTouchable: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: 2,
  },
  headerBrand: {
    fontSize: 18,
    fontStyle: "italic",
    fontWeight: "600",
    color: C.accent,
    letterSpacing: 1.2,
    fontFamily: Platform.OS === "ios" ? "Georgia-Italic" : "serif",
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#FFF",
  },
  headerAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.accent,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    gap: 4,
  },
  headerAddBtnText: {
    color: C.primary,
    fontSize: 13,
    fontFamily: "PlusJakartaSans-Medium",
  },
  headerStats: {
    flexDirection: "row",
    backgroundColor: C.primaryAlt,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    alignItems: "center",
  },
  headerStatItem: { flex: 1, alignItems: "center" },
  headerStatLabel: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans-Regular",
    color: "#94A3B8",
    marginBottom: 3,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  headerStatValue: {
    fontSize: 16,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#FFF",
  },
  headerStatValueSm: {
    fontSize: 16,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#FFF",
  },
  headerStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#334155",
  },

  tabContainer: {
    flexDirection: "row",
    backgroundColor: C.primaryAlt,
    borderRadius: 12,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: 9,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: C.accent,
  },
  tabText: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans-Regular",
    color: "#94A3B8",
  },
  tabTextActive: {
    fontFamily: "PlusJakartaSans-Medium",
    color: C.primary,
  },

  // Content
  contentContainer: {
    flex: 1,
    backgroundColor: C.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -4,
  },
  filterSection: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    height: 44,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "PlusJakartaSans-Regular",
    color: C.text,
    padding: 0,
  },
  chipsContainer: { maxHeight: 36 },
  chipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "center",
  },
  chip: {
    paddingHorizontal: 14,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: "center",
    flexShrink: 0,
  },
  chipSelected: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  chipText: {
    fontSize: 12.5,
    fontFamily: "PlusJakartaSans-Regular",
    color: C.textMuted,
  },
  chipTextSelected: {
    fontFamily: "PlusJakartaSans-Medium",
    color: "#FFF",
  },

  listScroll: { flex: 1 },
  listContent: {
    padding: 16,
    gap: 14,
  },
  groupCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  groupTop: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  avatarLg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: C.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarLgText: {
    fontSize: 17,
    fontFamily: "PlusJakartaSans-Medium",
    color: C.accent,
  },
  groupName: {
    fontSize: 15,
    fontFamily: "PlusJakartaSans-Medium",
    color: C.text,
    marginBottom: 3,
  },
  groupMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  groupMetaText: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans-Regular",
    color: C.textMuted,
    flexShrink: 1,
  },
  groupMetaDot: {
    fontSize: 10,
    color: C.textFaint,
    marginHorizontal: 3,
  },
  iconBtnRow: { flexDirection: "row", gap: 6 },
  iconBtn: {
    padding: 8,
    backgroundColor: C.surfaceAlt,
    borderRadius: 8,
  },

  groupProducts: { padding: 14, gap: 14 },
  prodRow: { gap: 10 },
  prodRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingBottom: 14,
    marginBottom: 0,
  },
  prodHead: { flexDirection: "row" },
  prodName: {
    fontSize: 14.5,
    fontFamily: "PlusJakartaSans-Medium",
    color: C.text,
    marginBottom: 4,
  },
  prodPriceRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  prodPriceLabel: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans-Regular",
    color: C.textMuted,
  },
  prodPriceBold: {
    fontFamily: "PlusJakartaSans-Medium",
    color: C.text,
  },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: C.textFaint },

  // Photo evidence badge (Sebelum/Sisa)
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  photoBadge: {
    position: "relative",
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
  },
  photoBadgeImg: { width: "100%", height: "100%" },
  photoBadgePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  photoBadgeLabel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 2,
    alignItems: "center",
  },
  photoBadgeLabelText: {
    fontSize: 8.5,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#FFF",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },

  metricStack: { flex: 1, gap: 5 },
  metricRow: { flexDirection: "row", gap: 5 },
  metricPill: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metricPillLabel: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans-Regular",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  metricPillVal: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans-Medium",
  },

  setorBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.accentSoft,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  setorLabel: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans-Medium",
    color: C.accentDark,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  setorAmount: {
    fontSize: 15,
    fontFamily: "PlusJakartaSans-Medium",
    color: C.accentDark,
  },

  groupFooter: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.primary,
    padding: 14,
    gap: 10,
  },
  groupFooterLabel: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans-Regular",
    color: "#94A3B8",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  groupFooterAmount: {
    fontSize: 17,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#FFF",
  },
  groupFooterActions: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  waTextBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 9,
    gap: 4,
  },
  waTextBtnText: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans-Medium",
    color: C.success,
  },
  waImgBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.success,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9,
    gap: 5,
  },
  waImgBtnText: {
    fontSize: 11.5,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#FFF",
  },

  // FAB
  fab: {
    position: "absolute",
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: C.accent,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },

  // Empty
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.accentSoft,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "PlusJakartaSans-Medium",
    color: C.text,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans-Regular",
    color: C.textMuted,
    textAlign: "center",
    lineHeight: 19,
  },

  // Recap tab
  recapContent: {
    padding: 16,
    gap: 12,
  },
  recapBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.primary,
    padding: 14,
    borderRadius: 14,
  },
  recapBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.primaryAlt,
    justifyContent: "center",
    alignItems: "center",
  },
  recapBannerTitle: {
    fontSize: 15,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#FFF",
    marginBottom: 2,
  },
  recapBannerSub: {
    fontSize: 11.5,
    fontFamily: "PlusJakartaSans-Regular",
    color: "#94A3B8",
    lineHeight: 16,
  },
  recapCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
  },
  recapCardTop: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  recapTotalBadge: {
    backgroundColor: C.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: "flex-end",
    maxWidth: 130,
  },
  recapTotalLabel: {
    fontSize: 9,
    fontFamily: "PlusJakartaSans-Regular",
    color: C.accentDark,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  recapTotalVal: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans-Medium",
    color: C.accentDark,
  },
  recapItems: { gap: 6 },
  recapItemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surfaceAlt,
    padding: 8,
    borderRadius: 10,
    gap: 4,
  },
  recapItemPhotos: { flexDirection: "row", gap: 4 },
  recapItemName: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans-Medium",
    color: C.text,
  },
  recapItemMeta: {
    fontSize: 10.5,
    fontFamily: "PlusJakartaSans-Regular",
    color: C.textMuted,
    marginTop: 1,
  },
  recapItemSetor: {
    fontSize: 12.5,
    fontFamily: "PlusJakartaSans-Medium",
    color: C.success,
  },
  recapActions: {
    flexDirection: "row",
    gap: 8,
  },
  waTextBtnBig: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.successSoft,
    paddingVertical: 11,
    borderRadius: 10,
    gap: 6,
  },
  waTextBtnBigText: {
    fontSize: 12.5,
    fontFamily: "PlusJakartaSans-Medium",
    color: C.successDark,
  },
  waImgBtnBig: {
    flex: 1.4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.success,
    paddingVertical: 11,
    borderRadius: 10,
    gap: 6,
  },
  waImgBtnBigText: {
    fontSize: 12.5,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#FFF",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
  },
  modalContainer: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "94%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.borderStrong,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "PlusJakartaSans-Medium",
    color: C.text,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.surfaceAlt,
    justifyContent: "center",
    alignItems: "center",
  },
  modalScroll: {
    padding: 20,
    gap: 14,
  },
  inputGroup: { gap: 6 },
  inputLabel: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans-Medium",
    color: C.text,
  },
  inputSubLabel: {
    fontSize: 11.5,
    fontFamily: "PlusJakartaSans-Medium",
    color: C.textMuted,
  },
  textInput: {
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 14,
    fontFamily: "PlusJakartaSans-Regular",
    color: C.text,
  },
  rowInputs: { flexDirection: "row" },

  modalSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans-Medium",
    color: C.text,
  },
  addRowBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 3,
  },
  addRowBtnText: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans-Medium",
    color: C.accentDark,
  },

  formCard: {
    backgroundColor: C.bg,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
  },
  formCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  formCardTitleWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  formCardNo: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  formCardNoText: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans-Medium",
    color: C.accent,
  },
  formCardTitle: {
    fontSize: 13.5,
    fontFamily: "PlusJakartaSans-Medium",
    color: C.text,
  },
  removeBtn: {
    padding: 6,
    backgroundColor: C.warningSoft,
    borderRadius: 7,
  },

  // Photo capture in form
  photoCaptureRow: {
    flexDirection: "row",
    gap: 10,
  },
  photoCaptureBox: {
    flex: 1,
    aspectRatio: 4 / 3,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: C.border,
  },
  photoCaptureImg: { width: "100%", height: "100%" },
  photoCapturePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    gap: 3,
  },
  photoCaptureHint: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans-Medium",
  },
  photoCaptureTag: {
    position: "absolute",
    top: 6,
    left: 6,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    gap: 3,
  },
  photoCaptureTagText: {
    fontSize: 9,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#FFF",
    letterSpacing: 0.3,
  },
  captureHint: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans-Regular",
    color: C.textMuted,
    fontStyle: "italic",
  },

  livePreview: {
    flexDirection: "row",
    backgroundColor: C.surface,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
  },
  livePreviewItem: { flex: 1, alignItems: "center" },
  livePreviewLabel: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans-Regular",
    color: C.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  livePreviewVal: {
    fontSize: 13.5,
    fontFamily: "PlusJakartaSans-Medium",
    color: C.text,
  },
  livePreviewDivider: {
    width: 1,
    height: 28,
    backgroundColor: C.border,
  },

  addMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: C.accent,
    borderStyle: "dashed",
    borderRadius: 12,
    height: 46,
    gap: 6,
    backgroundColor: C.accentSoft,
  },
  addMoreBtnText: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans-Medium",
    color: C.accentDark,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.primary,
    borderRadius: 12,
    height: 52,
    marginTop: 8,
    gap: 8,
  },
  saveBtnText: {
    fontSize: 15,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#FFF",
  },

  // Confirm modal
  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  confirmBox: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    width: "100%",
    maxWidth: 340,
  },
  brandModalBox: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    width: "100%",
    maxWidth: 380,
  },
  confirmTitle: {
    fontSize: 17,
    fontFamily: "PlusJakartaSans-Medium",
    color: C.text,
    marginBottom: 6,
  },
  confirmMsg: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans-Regular",
    color: C.textMuted,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 19,
  },
  confirmActions: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  confirmCancel: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: C.surfaceAlt,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmCancelText: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans-Medium",
    color: C.text,
  },
  confirmDelete: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: C.warning,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmDeleteText: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#FFF",
  },

  // Toast
  toast: {
    position: "absolute",
    left: 20,
    right: 20,
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: {
    flex: 1,
    color: "#FFF",
    fontSize: 13,
    fontFamily: "PlusJakartaSans-Regular",
  },

  shotHidden: {
    position: "absolute",
    left: -10000,
    top: 0,
    width: 380,
  },
});

// Styles untuk composite shot card (dirender offscreen untuk share)
const shotStyles = StyleSheet.create({
  container: {
    width: 380,
    backgroundColor: "#FFFFFF",
    padding: 16,
  },
  header: {
    backgroundColor: "#0F172A",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 14,
  },
  brand: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#F59E0B",
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  title: {
    fontSize: 20,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#FFFFFF",
  },
  penitipRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 18,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#F59E0B",
  },
  penitipName: {
    fontSize: 15,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#0F172A",
  },
  penitipMeta: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans-Regular",
    color: "#64748B",
    marginTop: 2,
  },
  item: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
  },
  itemName: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#0F172A",
  },
  photoRow: {
    flexDirection: "row",
    gap: 8,
  },
  photoWrap: {
    flex: 1,
    aspectRatio: 4 / 3,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#E2E8F0",
  },
  photo: { width: "100%", height: "100%" },
  photoPh: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E2E8F0",
  },
  photoPhText: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans-Regular",
    color: "#64748B",
  },
  photoTag: {
    position: "absolute",
    top: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  photoTagText: {
    fontSize: 9,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#FFFFFF",
    letterSpacing: 0.4,
  },
  grid: {
    flexDirection: "row",
    gap: 6,
  },
  gridCell: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 8,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  gridLabel: {
    fontSize: 9,
    fontFamily: "PlusJakartaSans-Regular",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  gridVal: {
    fontSize: 15,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#0F172A",
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  priceLabel: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans-Regular",
    color: "#64748B",
  },
  setorBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    padding: 10,
    borderRadius: 8,
  },
  setorLabel: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#B45309",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  setorVal: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#B45309",
  },
  total: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0F172A",
    padding: 14,
    borderRadius: 12,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#F59E0B",
    letterSpacing: 1,
  },
  totalVal: {
    fontSize: 20,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#FFFFFF",
  },
  footer: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans-Regular",
    color: "#64748B",
    textAlign: "center",
    marginTop: 10,
  },
});
