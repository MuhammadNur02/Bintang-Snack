import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import AsyncStorage from "@react-native-async-storage/async-storage";
// @ts-ignore
import * as ImagePicker from "expo-image-picker";
import {
  INITIAL_CONSIGNMENT_GROUPS,
  ConsignmentGroup,
  ConsignmentProduct,
  calculateSetor,
  calculateTerjual,
} from "@/src/mock";

const STORAGE_KEY = "@apk_jastip_bintang_snack_groups_v1";

export default function App() {
  const [groups, setGroups] = useState<ConsignmentGroup[]>(INITIAL_CONSIGNMENT_GROUPS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPenitipFilter, setSelectedPenitipFilter] = useState("Semua");
  const [activeTab, setActiveTab] = useState<"ledger" | "summary">("ledger");

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  // Form Fields for Consignor
  const [penitip, setPenitip] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  // Form Fields for Products List in Modal
  const [formProducts, setFormProducts] = useState<
    Array<{
      id: string;
      itemName: string;
      hargaPokok: string;
      hargaJual: string;
      titip: string;
      sisa: string;
      imageUri: string;
    }>
  >([]);

  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        setGroups(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load saved groups", e);
    }
  };

  const saveGroupsData = async (newGroups: ConsignmentGroup[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newGroups));
    } catch (e) {
      console.error("Failed to save groups", e);
    }
  };

  const penitipList = ["Semua", ...Array.from(new Set(groups.map((g) => g.penitip)))];

  // Filter groups or products
  const filteredGroups = groups
    .map((group) => {
      const matchesPenitipFilter =
        selectedPenitipFilter === "Semua" || group.penitip === selectedPenitipFilter;
      if (!matchesPenitipFilter) return null;

      const matchingProducts = group.products.filter(
        (p) =>
          p.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          group.penitip.toLowerCase().includes(searchQuery.toLowerCase())
      );

      if (searchQuery.trim() === "" || matchingProducts.length > 0) {
        return {
          ...group,
          products: searchQuery.trim() === "" ? group.products : matchingProducts,
        };
      }
      return null;
    })
    .filter(Boolean) as ConsignmentGroup[];

  const pickImageForProduct = async (prodIndex: number) => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Izin Ditolak", "Izin galeri diperlukan untuk melampirkan foto barang.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setFormProducts((prev) =>
          prev.map((p, idx) => (idx === prodIndex ? { ...p, imageUri: uri } : p))
        );
      }
    } catch (e) {
      console.error("Error picking image", e);
    }
  };

  const addProductRowToForm = () => {
    setFormProducts((prev) => [
      ...prev,
      {
        id: "prod-" + Date.now() + Math.random(),
        itemName: "",
        hargaPokok: "",
        hargaJual: "",
        titip: "1",
        sisa: "0",
        imageUri: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&q=80",
      },
    ]);
  };

  const removeProductRowFromForm = (index: number) => {
    if (formProducts.length === 1) {
      Alert.alert("Perhatian", "Minimal harus ada 1 produk dalam penitipan.");
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
        titip: "1",
        sisa: "0",
        imageUri: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&q=80",
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
        imageUri: p.imageUri || "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&q=80",
      }))
    );
    setModalVisible(true);
  };

  const handleSaveGroup = () => {
    if (!penitip.trim()) {
      Alert.alert("Perhatian", "Nama Penitip wajib diisi.");
      return;
    }

    if (formProducts.length === 0) {
      Alert.alert("Perhatian", "Tambahkan minimal 1 item produk.");
      return;
    }

    const validatedProducts: ConsignmentProduct[] = [];
    for (let i = 0; i < formProducts.length; i++) {
      const fp = formProducts[i];
      if (!fp.itemName.trim() || !fp.hargaPokok || !fp.hargaJual || !fp.titip || fp.sisa === "") {
        Alert.alert("Perhatian", `Produk #${i + 1} belum lengkap diisi.`);
        return;
      }

      const hp = parseFloat(fp.hargaPokok);
      const hj = parseFloat(fp.hargaJual);
      const t = parseInt(fp.titip, 10);
      const s = parseInt(fp.sisa, 10);

      if (isNaN(hp) || isNaN(hj) || isNaN(t) || isNaN(s)) {
        Alert.alert("Error", `Harga & jumlah pada produk #${i + 1} harus berupa angka.`);
        return;
      }

      if (t < 1) {
        Alert.alert("Perhatian", `Jumlah titip produk #${i + 1} minimal 1 pcs.`);
        return;
      }

      if (s > t) {
        Alert.alert("Perhatian", `Jumlah sisa produk #${i + 1} tidak boleh melebihi jumlah titip.`);
        return;
      }

      validatedProducts.push({
        id: fp.id || "prod-" + Date.now() + i,
        itemName: fp.itemName.trim(),
        hargaPokok: hp,
        hargaJual: hj,
        titip: t,
        sisa: s,
        imageUri: fp.imageUri,
      });
    }

    let updatedGroups: ConsignmentGroup[];
    if (editingGroupId) {
      updatedGroups = groups.map((g) =>
        g.id === editingGroupId
          ? {
              ...g,
              penitip: penitip.trim(),
              whatsapp: whatsapp.trim(),
              products: validatedProducts,
              updatedAt: new Date().toISOString(),
            }
          : g
      );
    } else {
      const newGroup: ConsignmentGroup = {
        id: "group-" + Date.now(),
        penitip: penitip.trim(),
        whatsapp: whatsapp.trim(),
        products: validatedProducts,
        updatedAt: new Date().toISOString(),
      };
      updatedGroups = [newGroup, ...groups];
    }

    setGroups(updatedGroups);
    saveGroupsData(updatedGroups);
    setModalVisible(false);
  };

  const handleDeleteGroup = (groupId: string) => {
    Alert.alert("Konfirmasi Hapus", "Yakin ingin menghapus semua titipan penitip ini?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: () => {
          const updated = groups.filter((g) => g.id !== groupId);
          setGroups(updated);
          saveGroupsData(updated);
        },
      },
    ]);
  };

  const formatIDR = (val: number) => {
    return "Rp " + val.toLocaleString("id-ID");
  };

  // WhatsApp Share rekap for entire consignor group or single item
  const handleShareGroupWhatsApp = (group: ConsignmentGroup) => {
    let phone = group.whatsapp.trim();
    if (!phone) {
      Alert.alert("Nomor WhatsApp Kosong", "Harap isi nomor WhatsApp penitip terlebih dahulu pada menu edit.");
      return;
    }
    if (phone.startsWith("0")) {
      phone = "62" + phone.slice(1);
    } else if (phone.startsWith("+")) {
      phone = phone.slice(1);
    }

    let totalSetorGroup = 0;
    let itemsText = group.products
      .map((p, idx) => {
        const terjual = calculateTerjual(p.titip, p.sisa);
        const setor = calculateSetor(p);
        totalSetorGroup += setor;
        return (
          `${idx + 1}. *${p.itemName}*\n` +
          (p.imageUri ? `   🖼️ Foto: ${p.imageUri}\n` : "") +
          `   • Titip: ${p.titip} | Sisa: ${p.sisa} | Terjual: ${terjual}\n` +
          `   • Setor: ${formatIDR(setor)}`
        );
      })
      .join("\n\n");

    const message =
      `Halo *${group.penitip}*, berikut rekapitulasi titipan produk di Jastip Bintang Snack:\n\n` +
      itemsText +
      `\n\n💰 *TOTAL KESELURUHAN SETOR: ${formatIDR(totalSetorGroup)}*\n\n` +
      `Terima kasih! 🙏`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Gagal membuka WhatsApp.");
    });
  };

  const handleShareSingleProductWhatsApp = (group: ConsignmentGroup, product: ConsignmentProduct) => {
    let phone = group.whatsapp.trim();
    if (!phone) {
      Alert.alert("Nomor WhatsApp Kosong", "Harap isi nomor WhatsApp penitip terlebih dahulu.");
      return;
    }
    if (phone.startsWith("0")) {
      phone = "62" + phone.slice(1);
    } else if (phone.startsWith("+")) {
      phone = phone.slice(1);
    }

    const terjual = calculateTerjual(product.titip, product.sisa);
    const setor = calculateSetor(product);

    const message =
      `Halo *${group.penitip}*, rekap item *${product.itemName}* di Jastip Bintang Snack:\n\n` +
      (product.imageUri ? `🖼️ Foto: ${product.imageUri}\n` : "") +
      `• Titip: ${product.titip} pcs\n` +
      `• Sisa: ${product.sisa} pcs\n` +
      `• Terjual: ${terjual} pcs\n` +
      `• Harga Pokok: ${formatIDR(product.hargaPokok)}/pc\n` +
      `• *Total Setor: ${formatIDR(setor)}*\n\n` +
      `Terima kasih! 🙏`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Gagal membuka WhatsApp.");
    });
  };

  // Grand totals across all groups & products
  const allGroupsProducts = groups.flatMap((g) => g.products);
  const grandTotalSetor = allGroupsProducts.reduce((acc, curr) => acc + calculateSetor(curr), 0);

  return (
    <SafeAreaView style={styles.safeArea} testID="main-container">
      <StatusBar style="dark" backgroundColor="#FDFCFA" />

      {/* Header */}
      <View style={styles.header} testID="app-header">
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.headerSubtitle}>APK JASTIP BINTANG SNACK</Text>
            <Text style={styles.headerTitle}>Multi-Item Penitip & WA</Text>
          </View>
          <TouchableOpacity
            style={styles.addButtonHeader}
            onPress={openAddModal}
            testID="add-item-header-btn"
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
            <Text style={styles.addButtonHeaderText}>Tambah Penitip</Text>
          </TouchableOpacity>
        </View>

        {/* Navigation Tabs */}
        <View style={styles.tabContainer} testID="navigation-tabs">
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "ledger" && styles.tabButtonActive]}
            onPress={() => setActiveTab("ledger")}
            testID="tab-ledger"
          >
            <Ionicons
              name="list"
              size={16}
              color={activeTab === "ledger" ? "#C85A32" : "#6E6D68"}
            />
            <Text style={[styles.tabText, activeTab === "ledger" && styles.tabTextActive]}>
              Daftar Barang
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === "summary" && styles.tabButtonActive]}
            onPress={() => setActiveTab("summary")}
            testID="tab-summary"
          >
            <Ionicons
              name="wallet"
              size={16}
              color={activeTab === "summary" ? "#C85A32" : "#6E6D68"}
            />
            <Text style={[styles.tabText, activeTab === "summary" && styles.tabTextActive]}>
              Rekap Setoran
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area */}
      {activeTab === "ledger" ? (
        <View style={styles.contentContainer} testID="ledger-view">
          {/* Search & Filter Bar */}
          <View style={styles.filterSection}>
            <View style={styles.searchBox} testID="search-box">
              <Ionicons name="search" size={18} color="#99948B" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Cari penitip atau nama snack..."
                placeholderTextColor="#99948B"
                value={searchQuery}
                onChangeText={setSearchQuery}
                testID="search-input"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")} testID="clear-search">
                  <Ionicons name="close-circle" size={18} color="#99948B" />
                </TouchableOpacity>
              )}
            </View>

            {/* Penitip Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsScroll}
              style={styles.chipsContainer}
              testID="penitip-filter-chips"
            >
              {penitipList.map((p) => {
                const isSelected = selectedPenitipFilter === p;
                return (
                  <TouchableOpacity
                    key={p}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => setSelectedPenitipFilter(p)}
                    testID={`chip-penitip-${p.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {p}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* List of Consignor Groups */}
          <ScrollView
            style={styles.itemsListScroll}
            contentContainerStyle={styles.itemsListContent}
            showsVerticalScrollIndicator={false}
            testID="consignment-groups-list"
          >
            {filteredGroups.length === 0 ? (
              <View style={styles.emptyContainer} testID="empty-state">
                <Ionicons name="basket-outline" size={56} color="#C8BFAF" />
                <Text style={styles.emptyTitle}>Tidak ada data jastip</Text>
                <Text style={styles.emptySubtitle}>
                  Tekan tombol &quot;Tambah Penitip&quot; di atas untuk mencatat multi-item titipan.
                </Text>
              </View>
            ) : (
              filteredGroups.map((group, groupIndex) => {
                const groupTotalSetor = group.products.reduce(
                  (acc, curr) => acc + calculateSetor(curr),
                  0
                );
                return (
                  <View key={group.id} style={styles.consignorGroupCard} testID={`group-card-${groupIndex}`}>
                    {/* Consignor Header Bar */}
                    <View style={styles.groupHeaderRow}>
                      <View style={styles.consignorAvatarSm}>
                        <Text style={styles.consignorAvatarSmText}>{group.penitip.charAt(0)}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.groupConsignorName}>{group.penitip}</Text>
                        <Text style={styles.groupSubMeta}>
                          {group.products.length} jenis barang | WA: {group.whatsapp || "Belum ada"}
                        </Text>
                      </View>
                      <View style={styles.groupActionRow}>
                        <TouchableOpacity
                          style={styles.cardIconButton}
                          onPress={() => openEditModal(group)}
                          testID={`edit-group-${group.id}`}
                        >
                          <Ionicons name="pencil" size={16} color="#3B6E8C" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.cardIconButton}
                          onPress={() => handleDeleteGroup(group.id)}
                          testID={`delete-group-${group.id}`}
                        >
                          <Ionicons name="trash-outline" size={16} color="#A33324" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Products List inside Consignor Group */}
                    <View style={styles.groupProductsContainer}>
                      {group.products.map((prod, prodIndex) => {
                        const terjual = calculateTerjual(prod.titip, prod.sisa);
                        const setor = calculateSetor(prod);
                        return (
                          <View
                            key={prod.id}
                            style={[
                              styles.productRowCard,
                              prodIndex < group.products.length - 1 && styles.productRowBorder,
                            ]}
                            testID={`product-row-${group.id}-${prodIndex}`}
                          >
                            <View style={styles.productRowTop}>
                              {prod.imageUri ? (
                                <Image source={{ uri: prod.imageUri }} style={styles.prodThumb} />
                              ) : (
                                <View style={[styles.prodThumb, styles.prodThumbPlaceholder]}>
                                  <Ionicons name="image" size={16} color="#C8BFAF" />
                                </View>
                              )}
                              <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={styles.prodName}>{prod.itemName}</Text>
                                <View style={styles.prodPricesSubRow}>
                                  <Text style={styles.prodPriceLabel}>
                                    Pokok: <Text style={styles.prodPriceBold}>{formatIDR(prod.hargaPokok)}</Text>
                                  </Text>
                                  <Text style={styles.prodPriceDot}>•</Text>
                                  <Text style={styles.prodPriceLabel}>
                                    Jual: <Text style={styles.prodPriceBoldGreen}>{formatIDR(prod.hargaJual)}</Text>
                                  </Text>
                                </View>
                              </View>
                            </View>

                            {/* Metrics Grid per Product */}
                            <View style={styles.metricsGrid}>
                              <View style={styles.metricBox}>
                                <Text style={styles.metricLabel}>Titip</Text>
                                <Text style={styles.metricVal}>{prod.titip}</Text>
                              </View>
                              <View style={styles.metricBox}>
                                <Text style={styles.metricLabel}>Sisa</Text>
                                <Text style={styles.metricValOrange}>{prod.sisa}</Text>
                              </View>
                              <View style={styles.metricBox}>
                                <Text style={styles.metricLabel}>Terjual</Text>
                                <Text style={styles.metricValGreen}>{terjual}</Text>
                              </View>
                              <View style={[styles.metricBox, styles.metricBoxHighlight]}>
                                <Text style={styles.metricLabelHighlight}>Setor</Text>
                                <Text style={styles.metricValHighlight}>{formatIDR(setor)}</Text>
                              </View>
                            </View>

                            <TouchableOpacity
                              style={styles.whatsappButtonSingle}
                              onPress={() => handleShareSingleProductWhatsApp(group, prod)}
                              testID={`share-prod-${prod.id}`}
                            >
                              <Ionicons name="logo-whatsapp" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                              <Text style={styles.whatsappButtonSingleText}>Kirim Rekap Item Ini ke WA</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>

                    {/* Group Footer with Total Setor & All-in-one WA Share */}
                    <View style={styles.groupFooter}>
                      <View>
                        <Text style={styles.groupFooterLabel}>Total Setor {group.penitip}</Text>
                        <Text style={styles.groupFooterAmount}>{formatIDR(groupTotalSetor)}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.whatsappButtonAll}
                        onPress={() => handleShareGroupWhatsApp(group)}
                        testID={`share-group-all-${group.id}`}
                      >
                        <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.whatsappButtonAllText}>Kirim Semua Rekap (WA)</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Sticky Bottom Summary Bar */}
          <View style={styles.stickyBottomBar} testID="sticky-summary-bar">
            <View style={styles.bottomBarInfo}>
              <Text style={styles.bottomBarLabel}>Total Setor Seluruh Penitip</Text>
              <Text style={styles.bottomBarAmount}>{formatIDR(grandTotalSetor)}</Text>
            </View>
            <TouchableOpacity
              style={styles.floatingAddBtn}
              onPress={openAddModal}
              testID="floating-add-btn"
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* Rekap Setoran Tab */
        <ScrollView
          style={styles.contentContainer}
          contentContainerStyle={styles.recapContent}
          showsVerticalScrollIndicator={false}
          testID="recap-view"
        >
          <View style={styles.recapHeaderBanner}>
            <Text style={styles.recapBannerTitle}>Rekapitulasi Total Setoran Penitip</Text>
            <Text style={styles.recapBannerSubtitle}>
              Kirim rekap lengkap seluruh item titipan (Nasi, Sate, Gorengan, dll) beserta bukti foto dan total setor langsung ke WhatsApp penitip.
            </Text>
          </View>

          {groups.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="wallet-outline" size={56} color="#C8BFAF" />
              <Text style={styles.emptyTitle}>Belum ada data rekap</Text>
            </View>
          ) : (
            groups.map((g, idx) => {
              const gTotalSetor = g.products.reduce((acc, curr) => acc + calculateSetor(curr), 0);
              return (
                <View key={g.id} style={styles.consignorCard} testID={`consignor-card-${idx}`}>
                  <View style={styles.consignorCardTop}>
                    <View style={styles.consignorAvatar}>
                      <Text style={styles.consignorAvatarText}>{g.penitip.charAt(0)}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.consignorName}>{g.penitip}</Text>
                      <Text style={styles.consignorItemCount}>{g.products.length} jenis item dititipkan</Text>
                      {g.whatsapp ? <Text style={styles.waText}>WA: {g.whatsapp}</Text> : null}
                    </View>
                    <View style={styles.consignorTotalBadge}>
                      <Text style={styles.consignorTotalLabel}>Total Setor</Text>
                      <Text style={styles.consignorTotalValue}>{formatIDR(gTotalSetor)}</Text>
                    </View>
                  </View>

                  {/* Items breakdown */}
                  <View style={styles.consignorItemsList}>
                    {g.products.map((it) => {
                      const terjual = calculateTerjual(it.titip, it.sisa);
                      const setorItem = calculateSetor(it);
                      return (
                        <View key={it.id} style={styles.consignorSubItemRow}>
                          {it.imageUri ? (
                            <Image source={{ uri: it.imageUri }} style={styles.subItemThumb} />
                          ) : null}
                          <View style={{ flex: 1, marginLeft: it.imageUri ? 8 : 0 }}>
                            <Text style={styles.subItemName}>{it.itemName}</Text>
                            <Text style={styles.subItemMeta}>
                              Titip: {it.titip} | Sisa: {it.sisa} | Terjual: {terjual}
                            </Text>
                          </View>
                          <View style={{ alignItems: "flex-end" }}>
                            <Text style={styles.subItemSetor}>{formatIDR(setorItem)}</Text>
                            <TouchableOpacity
                              onPress={() => handleShareSingleProductWhatsApp(g, it)}
                              style={styles.subItemWaBtn}
                            >
                              <Ionicons name="logo-whatsapp" size={12} color="#3B7A57" />
                              <Text style={styles.subItemWaText}>WA Item</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>

                  <TouchableOpacity
                    style={styles.recapShareAllBtn}
                    onPress={() => handleShareGroupWhatsApp(g)}
                    testID={`recap-share-all-${g.id}`}
                  >
                    <Ionicons name="logo-whatsapp" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.recapShareAllText}>Kirim Rekap Semua Item ke WA {g.penitip}</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Add / Edit Modal Form with Multi-Item Support */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer} testID="item-form-modal">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingGroupId ? "Edit Titipan Penitip" : "Tambah Penitip & Multi-Item"}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseBtn}
                testID="close-modal-btn"
              >
                <Ionicons name="close" size={20} color="#1A1A18" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalFormScroll} showsVerticalScrollIndicator={false}>
              {/* Nama Penitip */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nama Penitip (misal: Bu Siti)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Contoh: Bu Siti, Pak Joko"
                  placeholderTextColor="#99948B"
                  value={penitip}
                  onChangeText={setPenitip}
                  testID="input-penitip"
                />
              </View>

              {/* Nomor WhatsApp */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nomor WhatsApp Penitip</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Contoh: 081234567890"
                  placeholderTextColor="#99948B"
                  keyboardType="phone-pad"
                  value={whatsapp}
                  onChangeText={setWhatsapp}
                  testID="input-whatsapp"
                />
              </View>

              <View style={styles.modalDivider} />

              <View style={styles.modalSectionTitleRow}>
                <Text style={styles.modalSectionTitle}>Daftar Produk Dititipkan ({formProducts.length})</Text>
                <TouchableOpacity
                  style={styles.addProductRowBtn}
                  onPress={addProductRowToForm}
                  testID="add-product-row-btn"
                >
                  <Ionicons name="add" size={14} color="#C85A32" />
                  <Text style={styles.addProductRowText}>Tambah Item Lagi</Text>
                </TouchableOpacity>
              </View>

              {formProducts.map((fp, index) => (
                <View key={fp.id || index} style={styles.formProductCard} testID={`form-product-card-${index}`}>
                  <View style={styles.formProductCardHeader}>
                    <Text style={styles.formProductCardTitle}>Produk #{index + 1}</Text>
                    {formProducts.length > 1 && (
                      <TouchableOpacity
                        onPress={() => removeProductRowFromForm(index)}
                        testID={`remove-prod-row-${index}`}
                      >
                        <Ionicons name="trash-outline" size={16} color="#A33324" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Foto Produk */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputSubLabel}>Foto Barang</Text>
                    <View style={styles.photoPickerRow}>
                      {fp.imageUri ? (
                        <Image source={{ uri: fp.imageUri }} style={styles.previewPhoto} />
                      ) : (
                        <View style={styles.previewPhotoPlaceholder}>
                          <Ionicons name="camera-outline" size={20} color="#99948B" />
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.pickImageBtn}
                        onPress={() => pickImageForProduct(index)}
                        testID={`pick-img-${index}`}
                      >
                        <Ionicons name="image-outline" size={14} color="#C85A32" style={{ marginRight: 4 }} />
                        <Text style={styles.pickImageBtnText}>Pilih Foto</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Nama Item */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputSubLabel}>Nama Item (misal: Nasi / Sate / Gorengan)</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Nama snack atau makanan"
                      placeholderTextColor="#99948B"
                      value={fp.itemName}
                      onChangeText={(val) => {
                        setFormProducts((prev) =>
                          prev.map((p, idx) => (idx === index ? { ...p, itemName: val } : p))
                        );
                      }}
                      testID={`input-item-name-${index}`}
                    />
                  </View>

                  {/* Harga Pokok & Harga Jual */}
                  <View style={styles.rowInputs}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: 6 }]}>
                      <Text style={styles.inputSubLabel}>Harga Pokok (Rp)</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="1000"
                        placeholderTextColor="#99948B"
                        keyboardType="numeric"
                        value={fp.hargaPokok}
                        onChangeText={(val) => {
                          setFormProducts((prev) =>
                            prev.map((p, idx) => (idx === index ? { ...p, hargaPokok: val } : p))
                          );
                        }}
                        testID={`input-harga-pokok-${index}`}
                      />
                    </View>

                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 6 }]}>
                      <Text style={styles.inputSubLabel}>Harga Jual (Rp)</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="1500"
                        placeholderTextColor="#99948B"
                        keyboardType="numeric"
                        value={fp.hargaJual}
                        onChangeText={(val) => {
                          setFormProducts((prev) =>
                            prev.map((p, idx) => (idx === index ? { ...p, hargaJual: val } : p))
                          );
                        }}
                        testID={`input-harga-jual-${index}`}
                      />
                    </View>
                  </View>

                  {/* Titip & Sisa (> 1 support) */}
                  <View style={styles.rowInputs}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: 6 }]}>
                      <Text style={styles.inputSubLabel}>Jumlah Titip (Pcs)</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="3"
                        placeholderTextColor="#99948B"
                        keyboardType="numeric"
                        value={fp.titip}
                        onChangeText={(val) => {
                          setFormProducts((prev) =>
                            prev.map((p, idx) => (idx === index ? { ...p, titip: val } : p))
                          );
                        }}
                        testID={`input-titip-${index}`}
                      />
                    </View>

                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 6 }]}>
                      <Text style={styles.inputSubLabel}>Sisa Barang (Pcs)</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="1"
                        placeholderTextColor="#99948B"
                        keyboardType="numeric"
                        value={fp.sisa}
                        onChangeText={(val) => {
                          setFormProducts((prev) =>
                            prev.map((p, idx) => (idx === index ? { ...p, sisa: val } : p))
                          );
                        }}
                        testID={`input-sisa-${index}`}
                      />
                    </View>
                  </View>

                  {/* Live preview for this row */}
                  <View style={styles.rowPreview}>
                    <Text style={styles.rowPreviewText}>
                      Terjual:{" "}
                      <Text style={{ fontFamily: "PlusJakartaSans-Medium", color: "#1A1A18" }}>
                        {Math.max(0, (parseInt(fp.titip, 10) || 0) - (parseInt(fp.sisa, 10) || 0))} pcs
                      </Text>{" "}
                      | Setor:{" "}
                      <Text style={{ fontFamily: "PlusJakartaSans-Medium", color: "#C85A32" }}>
                        {formatIDR(
                          Math.max(0, (parseInt(fp.titip, 10) || 0) - (parseInt(fp.sisa, 10) || 0)) *
                            (parseFloat(fp.hargaPokok) || 0)
                        )}
                      </Text>
                    </Text>
                  </View>
                </View>
              ))}

              <TouchableOpacity
                style={styles.addMoreRowBtnBottom}
                onPress={addProductRowToForm}
                testID="add-more-bottom-btn"
              >
                <Ionicons name="add-circle-outline" size={18} color="#C85A32" style={{ marginRight: 6 }} />
                <Text style={styles.addMoreRowBtnText}>Tambah Item Produk Lainnya</Text>
              </TouchableOpacity>

              {/* Save Button */}
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveGroup}
                testID="submit-item-btn"
              >
                <Text style={styles.saveButtonText}>
                  {editingGroupId ? "Simpan Perubahan" : "Simpan Semua Penitipan"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FDFCFA",
  },
  header: {
    backgroundColor: "#FDFCFA",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E2DDD5",
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerSubtitle: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#C85A32",
    letterSpacing: 1,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#1A1A18",
  },
  addButtonHeader: {
    flexDirection: "row",
    backgroundColor: "#C85A32",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  addButtonHeaderText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "PlusJakartaSans-Medium",
    marginLeft: 4,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#F4F1EA",
    borderRadius: 8,
    padding: 3,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 6,
  },
  tabButtonActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans-Regular",
    color: "#6E6D68",
    marginLeft: 6,
  },
  tabTextActive: {
    fontFamily: "PlusJakartaSans-Medium",
    color: "#C85A32",
  },
  contentContainer: {
    flex: 1,
    backgroundColor: "#FDFCFA",
  },
  filterSection: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EFECE6",
    backgroundColor: "#FDFCFA",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F1EA",
    marginHorizontal: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    height: 40,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2DDD5",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "PlusJakartaSans-Regular",
    color: "#1A1A18",
  },
  chipsContainer: {
    maxHeight: 40,
  },
  chipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F4F1EA",
    borderWidth: 1,
    borderColor: "#E2DDD5",
    height: 32,
    justifyContent: "center",
    flexShrink: 0,
  },
  chipSelected: {
    backgroundColor: "#C85A32",
    borderColor: "#C85A32",
  },
  chipText: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans-Regular",
    color: "#2C2B27",
  },
  chipTextSelected: {
    fontFamily: "PlusJakartaSans-Medium",
    color: "#FFFFFF",
  },
  itemsListScroll: {
    flex: 1,
  },
  itemsListContent: {
    padding: 16,
    gap: 16,
  },
  consignorGroupCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2DDD5",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  groupHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7EBE5",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2DDD5",
  },
  consignorAvatarSm: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#C85A32",
    justifyContent: "center",
    alignItems: "center",
  },
  consignorAvatarSmText: {
    fontSize: 16,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#FFFFFF",
  },
  groupConsignorName: {
    fontSize: 15,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#9E3C18",
  },
  groupSubMeta: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans-Regular",
    color: "#732B10",
  },
  groupActionRow: {
    flexDirection: "row",
    gap: 6,
  },
  cardIconButton: {
    padding: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#D47853",
  },
  groupProductsContainer: {
    padding: 12,
    gap: 12,
  },
  productRowCard: {
    paddingBottom: 10,
  },
  productRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#EFECE6",
    marginBottom: 2,
  },
  productRowTop: {
    flexDirection: "row",
    marginBottom: 8,
  },
  prodThumb: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: "#F4F1EA",
  },
  prodThumbPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  prodName: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#1A1A18",
    marginBottom: 2,
  },
  prodPricesSubRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  prodPriceLabel: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans-Regular",
    color: "#6E6D68",
  },
  prodPriceBold: {
    fontFamily: "PlusJakartaSans-Medium",
    color: "#2C2B27",
  },
  prodPriceBoldGreen: {
    fontFamily: "PlusJakartaSans-Medium",
    color: "#3B7A57",
  },
  prodPriceDot: {
    marginHorizontal: 6,
    color: "#6E6D68",
    fontSize: 10,
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  metricBox: {
    flex: 1,
    backgroundColor: "#F4F1EA",
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 9,
    fontFamily: "PlusJakartaSans-Regular",
    color: "#6E6D68",
    marginBottom: 1,
  },
  metricVal: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#1A1A18",
  },
  metricValOrange: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#C27803",
  },
  metricValGreen: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#3B7A57",
  },
  metricBoxHighlight: {
    flex: 1.3,
    backgroundColor: "#F7EBE5",
    borderWidth: 1,
    borderColor: "#D47853",
  },
  metricLabelHighlight: {
    fontSize: 9,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#9E3C18",
    marginBottom: 1,
  },
  metricValHighlight: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#9E3C18",
  },
  whatsappButtonSingle: {
    flexDirection: "row",
    backgroundColor: "#3B7A57",
    paddingVertical: 6,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  whatsappButtonSingleText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: "PlusJakartaSans-Medium",
  },
  groupFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1A1A18",
    padding: 12,
  },
  groupFooterLabel: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans-Regular",
    color: "#E2DDD5",
  },
  groupFooterAmount: {
    fontSize: 15,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#FFFFFF",
  },
  whatsappButtonAll: {
    flexDirection: "row",
    backgroundColor: "#C85A32",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  whatsappButtonAllText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "PlusJakartaSans-Medium",
  },
  stickyBottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#1A1A18",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#2C2B27",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 8,
  },
  bottomBarInfo: {
    flex: 1,
  },
  bottomBarLabel: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans-Regular",
    color: "#E2DDD5",
  },
  bottomBarAmount: {
    fontSize: 18,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#FFFFFF",
  },
  floatingAddBtn: {
    backgroundColor: "#C85A32",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  recapContent: {
    padding: 16,
    gap: 12,
  },
  recapHeaderBanner: {
    backgroundColor: "#F7EBE5",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D47853",
    marginBottom: 4,
  },
  recapBannerTitle: {
    fontSize: 15,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#9E3C18",
    marginBottom: 4,
  },
  recapBannerSubtitle: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans-Regular",
    color: "#732B10",
    lineHeight: 18,
  },
  consignorCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2DDD5",
  },
  consignorCardTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EFECE6",
  },
  consignorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#C85A32",
    justifyContent: "center",
    alignItems: "center",
  },
  consignorAvatarText: {
    fontSize: 18,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#FFFFFF",
  },
  consignorName: {
    fontSize: 16,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#1A1A18",
  },
  consignorItemCount: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans-Regular",
    color: "#6E6D68",
  },
  consignorTotalBadge: {
    alignItems: "flex-end",
  },
  consignorTotalLabel: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans-Regular",
    color: "#6E6D68",
  },
  consignorTotalValue: {
    fontSize: 15,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#C85A32",
  },
  consignorItemsList: {
    gap: 8,
    marginBottom: 12,
  },
  consignorSubItemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F8F6",
    padding: 8,
    borderRadius: 8,
  },
  subItemThumb: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: "#F4F1EA",
  },
  subItemName: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#1A1A18",
  },
  subItemMeta: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans-Regular",
    color: "#6E6D68",
  },
  subItemSetor: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#3B7A57",
  },
  subItemWaBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    backgroundColor: "#EBF5ED",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  subItemWaText: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#3B7A57",
    marginLeft: 3,
  },
  recapShareAllBtn: {
    flexDirection: "row",
    backgroundColor: "#3B7A57",
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  recapShareAllText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "PlusJakartaSans-Medium",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#1A1A18",
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans-Regular",
    color: "#6E6D68",
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    backgroundColor: "#FDFCFA",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "92%",
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: "#E2DDD5",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EFECE6",
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#1A1A18",
  },
  modalCloseBtn: {
    padding: 6,
    backgroundColor: "#F4F1EA",
    borderRadius: 16,
  },
  modalFormScroll: {
    padding: 16,
    gap: 14,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#2C2B27",
  },
  inputSubLabel: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#6E6D68",
  },
  textInput: {
    backgroundColor: "#F4F1EA",
    borderWidth: 1,
    borderColor: "#E2DDD5",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
    fontFamily: "PlusJakartaSans-Regular",
    color: "#1A1A18",
  },
  rowInputs: {
    flexDirection: "row",
  },
  modalDivider: {
    height: 1,
    backgroundColor: "#E2DDD5",
    marginVertical: 4,
  },
  modalSectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalSectionTitle: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#1A1A18",
  },
  addProductRowBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7EBE5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#D47853",
  },
  addProductRowText: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#C85A32",
    marginLeft: 2,
  },
  formProductCard: {
    backgroundColor: "#F9F8F6",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2DDD5",
    gap: 8,
  },
  formProductCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E2DDD5",
    paddingBottom: 6,
  },
  formProductCardTitle: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#9E3C18",
  },
  photoPickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  previewPhoto: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: "#F4F1EA",
  },
  previewPhotoPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: "#F4F1EA",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2DDD5",
  },
  pickImageBtn: {
    flex: 1,
    flexDirection: "row",
    height: 38,
    backgroundColor: "#F7EBE5",
    borderWidth: 1,
    borderColor: "#D47853",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  pickImageBtnText: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#9E3C18",
  },
  rowPreview: {
    backgroundColor: "#EFECE6",
    padding: 6,
    borderRadius: 6,
  },
  rowPreviewText: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans-Regular",
    color: "#6E6D68",
    textAlign: "center",
  },
  addMoreRowBtnBottom: {
    flexDirection: "row",
    backgroundColor: "#F7EBE5",
    borderWidth: 1,
    borderColor: "#D47853",
    borderRadius: 8,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
    borderStyle: "dashed",
  },
  addMoreRowBtnText: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#9E3C18",
  },
  saveButton: {
    backgroundColor: "#C85A32",
    borderRadius: 10,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 15,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#FFFFFF",
  },
});
