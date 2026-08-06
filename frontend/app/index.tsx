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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { INITIAL_CONSIGNMENT_ITEMS, ConsignmentItem, calculateSetor, calculateTerjual } from "@/src/mock";

const STORAGE_KEY = "@apk_jastip_bintang_snack_items_v2";

export default function App() {
  const [items, setItems] = useState<ConsignmentItem[]>(INITIAL_CONSIGNMENT_ITEMS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPenitipFilter, setSelectedPenitipFilter] = useState("Semua");
  const [activeTab, setActiveTab] = useState<"ledger" | "consignors" | "summary">("ledger");

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<ConsignmentItem | null>(null);

  // Form Fields
  const [penitip, setPenitip] = useState("");
  const [itemName, setItemName] = useState("");
  const [hargaPokok, setHargaPokok] = useState("");
  const [hargaJual, setHargaJual] = useState("");
  const [titip, setTitip] = useState("");
  const [sisa, setSisa] = useState("");

  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load saved items", e);
    }
  };

  const saveData = async (newItems: ConsignmentItem[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
    } catch (e) {
      console.error("Failed to save items", e);
    }
  };

  // Unique list of penitip for filters
  const penitipList = ["Semua", ...Array.from(new Set(items.map((i) => i.penitip)))];

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.penitip.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPenitip =
      selectedPenitipFilter === "Semua" || item.penitip === selectedPenitipFilter;
    return matchesSearch && matchesPenitip;
  });

  const openAddModal = () => {
    setEditingItem(null);
    setPenitip("");
    setItemName("");
    setHargaPokok("");
    setHargaJual("");
    setTitip("");
    setSisa("");
    setModalVisible(true);
  };

  const openEditModal = (item: ConsignmentItem) => {
    setEditingItem(item);
    setPenitip(item.penitip);
    setItemName(item.itemName);
    setHargaPokok(item.hargaPokok.toString());
    setHargaJual(item.hargaJual.toString());
    setTitip(item.titip.toString());
    setSisa(item.sisa.toString());
    setModalVisible(true);
  };

  const handleSaveItem = () => {
    if (!penitip.trim() || !itemName.trim() || !hargaPokok || !hargaJual || !titip || sisa === "") {
      Alert.alert("Perhatian", "Semua kolom form wajib diisi dengan benar.");
      return;
    }

    const hp = parseFloat(hargaPokok);
    const hj = parseFloat(hargaJual);
    const t = parseInt(titip, 10);
    const s = parseInt(sisa, 10);

    if (isNaN(hp) || isNaN(hj) || isNaN(t) || isNaN(s)) {
      Alert.alert("Error", "Harga dan jumlah harus berupa angka.");
      return;
    }

    if (s > t) {
      Alert.alert("Perhatian", "Jumlah Sisa tidak boleh lebih besar dari jumlah Titip.");
      return;
    }

    let updated: ConsignmentItem[];
    if (editingItem) {
      updated = items.map((i) =>
        i.id === editingItem.id
          ? {
              ...i,
              penitip: penitip.trim(),
              itemName: itemName.trim(),
              hargaPokok: hp,
              hargaJual: hj,
              titip: t,
              sisa: s,
              updatedAt: new Date().toISOString(),
            }
          : i
      );
    } else {
      const newItem: ConsignmentItem = {
        id: "item-" + Date.now(),
        penitip: penitip.trim(),
        itemName: itemName.trim(),
        hargaPokok: hp,
        hargaJual: hj,
        titip: t,
        sisa: s,
        updatedAt: new Date().toISOString(),
      };
      updated = [newItem, ...items];
    }

    setItems(updated);
    saveData(updated);
    setModalVisible(false);
  };

  const handleDeleteItem = (id: string) => {
    Alert.alert("Konfirmasi Hapus", "Yakin ingin menghapus item jastip ini?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: () => {
          const updated = items.filter((i) => i.id !== id);
          setItems(updated);
          saveData(updated);
        },
      },
    ]);
  };

  // Financial Summary Totals (active values tracked for dashboard metrics)
  const totalSetorAmount = items.reduce((acc, curr) => acc + calculateSetor(curr), 0);

  // Group by Penitip for Payout Summary Tab
  const consignorsMap = items.reduce((acc, curr) => {
    if (!acc[curr.penitip]) {
      acc[curr.penitip] = {
        penitip: curr.penitip,
        itemsCount: 0,
        totalSetor: 0,
        items: [],
      };
    }
    acc[curr.penitip].itemsCount += 1;
    acc[curr.penitip].totalSetor += calculateSetor(curr);
    acc[curr.penitip].items.push(curr);
    return acc;
  }, {} as Record<string, { penitip: string; itemsCount: number; totalSetor: number; items: ConsignmentItem[] }>);

  const consignorSummaries = Object.values(consignorsMap);

  const formatIDR = (val: number) => {
    return "Rp " + val.toLocaleString("id-ID");
  };

  return (
    <SafeAreaView style={styles.safeArea} testID="main-container">
      <StatusBar style="dark" backgroundColor="#FDFCFA" />
      
      {/* Header */}
      <View style={styles.header} testID="app-header">
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.headerSubtitle}>APK JASTIP BINTANG SNACK</Text>
            <Text style={styles.headerTitle}>Manajemen Penitipan</Text>
          </View>
          <TouchableOpacity
            style={styles.addButtonHeader}
            onPress={openAddModal}
            testID="add-item-header-btn"
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
            <Text style={styles.addButtonHeaderText}>Tambah Item</Text>
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

          {/* Table / List of Items */}
          <ScrollView
            style={styles.itemsListScroll}
            contentContainerStyle={styles.itemsListContent}
            showsVerticalScrollIndicator={false}
            testID="consignment-items-list"
          >
            {filteredItems.length === 0 ? (
              <View style={styles.emptyContainer} testID="empty-state">
                <Ionicons name="basket-outline" size={56} color="#C8BFAF" />
                <Text style={styles.emptyTitle}>Tidak ada data jastip</Text>
                <Text style={styles.emptySubtitle}>
                  Tekan tombol &quot;Tambah Item&quot; di atas untuk mulai mencatat barang titipan.
                </Text>
              </View>
            ) : (
              filteredItems.map((item, index) => {
                const terjual = calculateTerjual(item.titip, item.sisa);
                const setor = calculateSetor(item);
                return (
                  <View key={item.id} style={styles.itemCard} testID={`item-card-${index}`}>
                    <View style={styles.itemCardHeader}>
                      <View style={styles.penitipTag}>
                        <Ionicons name="person" size={12} color="#C85A32" />
                        <Text style={styles.penitipTagText}>{item.penitip}</Text>
                      </View>
                      <View style={styles.actionButtonsRow}>
                        <TouchableOpacity
                          style={styles.cardIconButton}
                          onPress={() => openEditModal(item)}
                          testID={`edit-item-${item.id}`}
                        >
                          <Ionicons name="pencil" size={16} color="#3B6E8C" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.cardIconButton}
                          onPress={() => handleDeleteItem(item.id)}
                          testID={`delete-item-${item.id}`}
                        >
                          <Ionicons name="trash-outline" size={16} color="#A33324" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <Text style={styles.itemTitle}>{item.itemName}</Text>

                    <View style={styles.itemPricesRow}>
                      <View style={styles.priceCol}>
                        <Text style={styles.priceLabel}>Harga Pokok</Text>
                        <Text style={styles.priceValue}>{formatIDR(item.hargaPokok)}</Text>
                      </View>
                      <View style={styles.priceDivider} />
                      <View style={styles.priceCol}>
                        <Text style={styles.priceLabel}>Harga Jual</Text>
                        <Text style={styles.priceValueBold}>{formatIDR(item.hargaJual)}</Text>
                      </View>
                    </View>

                    {/* Stock & Calculation Metrics */}
                    <View style={styles.metricsGrid} testID={`metrics-grid-${item.id}`}>
                      <View style={styles.metricBox}>
                        <Text style={styles.metricLabel}>Titip</Text>
                        <Text style={styles.metricVal}>{item.titip}</Text>
                      </View>
                      <View style={styles.metricBox}>
                        <Text style={styles.metricLabel}>Sisa</Text>
                        <Text style={styles.metricValOrange}>{item.sisa}</Text>
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
                  </View>
                );
              })
            )}
            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Sticky Bottom Summary Bar */}
          <View style={styles.stickyBottomBar} testID="sticky-summary-bar">
            <View style={styles.bottomBarInfo}>
              <Text style={styles.bottomBarLabel}>Total Setor Semua Item</Text>
              <Text style={styles.bottomBarAmount}>{formatIDR(totalSetorAmount)}</Text>
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
            <Text style={styles.recapBannerTitle}>Rekapitulasi Setoran Penitip</Text>
            <Text style={styles.recapBannerSubtitle}>
              Total kewajiban setor bersih dikalkulasi dari (Titip - Sisa) × Harga Pokok per item.
            </Text>
          </View>

          {consignorSummaries.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="wallet-outline" size={56} color="#C8BFAF" />
              <Text style={styles.emptyTitle}>Belum ada data rekap</Text>
            </View>
          ) : (
            consignorSummaries.map((cs, idx) => (
              <View key={cs.penitip} style={styles.consignorCard} testID={`consignor-card-${idx}`}>
                <View style={styles.consignorCardTop}>
                  <View style={styles.consignorAvatar}>
                    <Text style={styles.consignorAvatarText}>{cs.penitip.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.consignorName}>{cs.penitip}</Text>
                    <Text style={styles.consignorItemCount}>{cs.itemsCount} jenis barang dititipkan</Text>
                  </View>
                  <View style={styles.consignorTotalBadge}>
                    <Text style={styles.consignorTotalLabel}>Total Setor</Text>
                    <Text style={styles.consignorTotalValue}>{formatIDR(cs.totalSetor)}</Text>
                  </View>
                </View>

                {/* Items breakdown */}
                <View style={styles.consignorItemsList}>
                  {cs.items.map((it) => {
                    const terjual = calculateTerjual(it.titip, it.sisa);
                    const setorItem = calculateSetor(it);
                    return (
                      <View key={it.id} style={styles.consignorSubItemRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.subItemName}>{it.itemName}</Text>
                          <Text style={styles.subItemMeta}>
                            Titip: {it.titip} | Sisa: {it.sisa} | Terjual: {terjual} ({formatIDR(it.hargaPokok)}/pc)
                          </Text>
                        </View>
                        <Text style={styles.subItemSetor}>{formatIDR(setorItem)}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Add / Edit Modal Form */}
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
                {editingItem ? "Edit Item Jastip" : "Tambah Item Jastip Baru"}
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
                <Text style={styles.inputLabel}>Nama Penitip</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Contoh: Bu Siti, Pak Joko"
                  placeholderTextColor="#99948B"
                  value={penitip}
                  onChangeText={setPenitip}
                  testID="input-penitip"
                />
              </View>

              {/* Nama Item */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nama Item Snack</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Contoh: Keripik Singkong Balado"
                  placeholderTextColor="#99948B"
                  value={itemName}
                  onChangeText={setItemName}
                  testID="input-item-name"
                />
              </View>

              {/* Harga Pokok & Harga Jual */}
              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>Harga Pokok (Rp)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="1000"
                    placeholderTextColor="#99948B"
                    keyboardType="numeric"
                    value={hargaPokok}
                    onChangeText={setHargaPokok}
                    testID="input-harga-pokok"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.inputLabel}>Harga Jual (Rp)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="1500"
                    placeholderTextColor="#99948B"
                    keyboardType="numeric"
                    value={hargaJual}
                    onChangeText={setHargaJual}
                    testID="input-harga-jual"
                  />
                </View>
              </View>

              {/* Titip & Sisa */}
              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>Jumlah Titip (Pcs)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="3"
                    placeholderTextColor="#99948B"
                    keyboardType="numeric"
                    value={titip}
                    onChangeText={setTitip}
                    testID="input-titip"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.inputLabel}>Sisa Barang (Pcs)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="1"
                    placeholderTextColor="#99948B"
                    keyboardType="numeric"
                    value={sisa}
                    onChangeText={setSisa}
                    testID="input-sisa"
                  />
                </View>
              </View>

              {/* Live Preview Calculation */}
              <View style={styles.previewBox} testID="live-calc-preview">
                <Text style={styles.previewTitle}>Preview Kalkulasi Otomatis</Text>
                <View style={styles.previewRow}>
                  <Text style={styles.previewText}>Barang Terjual:</Text>
                  <Text style={styles.previewValBold}>
                    {Math.max(0, (parseInt(titip, 10) || 0) - (parseInt(sisa, 10) || 0))} Pcs
                  </Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewText}>Setoran (Rumus Baru):</Text>
                  <Text style={styles.previewValHighlight}>
                    {formatIDR(
                      Math.max(0, (parseInt(titip, 10) || 0) - (parseInt(sisa, 10) || 0)) *
                        (parseFloat(hargaPokok) || 0)
                    )}
                  </Text>
                </View>
                <Text style={styles.previewNote}>Rumus: (Titip - Sisa) × Harga Pokok</Text>
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveItem}
                testID="submit-item-btn"
              >
                <Text style={styles.saveButtonText}>
                  {editingItem ? "Simpan Perubahan" : "Tambah Item"}
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
    fontSize: 22,
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
    gap: 12,
  },
  itemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2DDD5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  itemCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  penitipTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7EBE5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  penitipTagText: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#9E3C18",
    marginLeft: 4,
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  cardIconButton: {
    padding: 6,
    backgroundColor: "#F4F1EA",
    borderRadius: 6,
  },
  itemTitle: {
    fontSize: 16,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#1A1A18",
    marginBottom: 8,
  },
  itemPricesRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F8F6",
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  priceCol: {
    flex: 1,
    alignItems: "center",
  },
  priceDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#E2DDD5",
  },
  priceLabel: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans-Regular",
    color: "#6E6D68",
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#2C2B27",
  },
  priceValueBold: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#3B7A57",
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 6,
  },
  metricBox: {
    flex: 1,
    backgroundColor: "#F4F1EA",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans-Regular",
    color: "#6E6D68",
    marginBottom: 2,
  },
  metricVal: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#1A1A18",
  },
  metricValOrange: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#C27803",
  },
  metricValGreen: {
    fontSize: 13,
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
    fontSize: 10,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#9E3C18",
    marginBottom: 2,
  },
  metricValHighlight: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#9E3C18",
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
  },
  consignorSubItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F9F8F6",
    padding: 8,
    borderRadius: 8,
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
    maxHeight: "90%",
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
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#2C2B27",
  },
  textInput: {
    backgroundColor: "#F4F1EA",
    borderWidth: 1,
    borderColor: "#E2DDD5",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    fontFamily: "PlusJakartaSans-Regular",
    color: "#1A1A18",
  },
  rowInputs: {
    flexDirection: "row",
  },
  previewBox: {
    backgroundColor: "#F7EBE5",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#D47853",
    gap: 6,
    marginTop: 4,
  },
  previewTitle: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#9E3C18",
    marginBottom: 2,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  previewText: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans-Regular",
    color: "#732B10",
  },
  previewValBold: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#1A1A18",
  },
  previewValHighlight: {
    fontSize: 15,
    fontFamily: "PlusJakartaSans-Medium",
    color: "#C85A32",
  },
  previewNote: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans-Regular",
    color: "#9E3C18",
    fontStyle: "italic",
    marginTop: 2,
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
