import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    SafeAreaView,
    RefreshControl,
    Platform,
    Modal,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import DateTimePicker from "@react-native-community/datetimepicker";

interface FeedLog {
    log_id: string;
    log_kutsero_full_name?: string;
    log_user_full_name?: string;
    log_date: string;
    log_meal: string;
    log_time: string;
    log_food: string;
    log_amount: string;
    log_status: string;
    log_action: string;
    created_at: string;
}

interface FeedLogPageProps {
    onBack: () => void;
    logs: FeedLog[];
    horseName: string;
    onRefresh: () => void;
}

export default function FeedLogPage({ onBack, logs, horseName, onRefresh }: FeedLogPageProps) {
    const [selectedDateObj, setSelectedDateObj] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedMeal, setSelectedMeal] = useState("All Meals");
    const [showMealDropdown, setShowMealDropdown] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const mealOptions = ["All Meals", "Breakfast", "Lunch", "Dinner"];

    useEffect(() => {
        console.log('=== FeedLogPage Debug Info ===');
        console.log('Total logs received:', logs.length);
        console.log('Horse name:', horseName);
        
        if (logs.length > 0) {
            console.log('Sample log structure:', JSON.stringify(logs[0], null, 2));
        }
    }, [logs, horseName]);

    const formatDate = (date: Date) => {
        try {
            return date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
            });
        } catch (error) {
            console.error("Error formatting date:", error);
            return "Invalid Date";
        }
    };

    const selectedDate = formatDate(selectedDateObj);

    const handleDatePress = () => {
        setShowDatePicker(true);
    };

    const onDateChange = (event: any, selected?: Date) => {
        setShowDatePicker(Platform.OS === "ios");
        if (selected) {
            setSelectedDateObj(selected);
            console.log('Date changed to:', selected.toISOString().split('T')[0]);
        }
    };

    const handleMealSelect = (meal: string) => {
        setSelectedMeal(meal);
        setShowMealDropdown(false);
        console.log('Meal filter changed to:', meal);
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        console.log('Refreshing feed logs...');
        await onRefresh();
        setRefreshing(false);
    };

    // Clean meal name by removing question mark
    const cleanMealName = (meal: string) => {
        return meal ? meal.replace(/^\?/, '') : '';
    };

    const selectedDateString = selectedDateObj.toISOString().split('T')[0];
    
    const filteredLogs = logs
        .filter(log => {
            const logDate = log.log_date || log.created_at?.split('T')[0];
            const dateMatch = logDate === selectedDateString;
            const cleanedMeal = cleanMealName(log.log_meal);
            const mealMatch = selectedMeal === "All Meals" || cleanedMeal === selectedMeal;
            return dateMatch && mealMatch;
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    console.log('Filtered logs count:', filteredLogs.length);

    const getMealIcon = (meal: string) => {
        const cleanMeal = cleanMealName(meal);
        switch (cleanMeal) {
            case 'Breakfast': return 'sunrise';
            case 'Lunch': return 'sun';
            case 'Dinner': return 'moon';
            default: return 'utensils';
        }
    };

    const getMealColor = (meal: string) => {
        const cleanMeal = cleanMealName(meal);
        switch (cleanMeal) {
            case 'Breakfast': return '#F59E0B';
            case 'Lunch': return '#10B981';
            case 'Dinner': return '#6366F1';
            default: return '#64748B';
        }
    };

    const getUserName = (log: FeedLog) => {
        return log.log_kutsero_full_name || log.log_user_full_name || 'Unknown User';
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Modern Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <FontAwesome5 name="arrow-left" size={18} color="#1F2937" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Feed Log</Text>
                    <Text style={styles.headerSubtitle}>{horseName}</Text>
                </View>
                <View style={styles.placeholder} />
            </View>

            <ScrollView 
                style={styles.container} 
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
            >
                {/* Enhanced Filter Section */}
                <View style={styles.filterSection}>
                    <View style={styles.filterHeader}>
                        <View style={styles.filterTitleContainer}>
                            <FontAwesome5 name="filter" size={16} color="#6366F1" />
                            <Text style={styles.filterTitle}>Filters</Text>
                        </View>
                        <View style={styles.resultBadge}>
                            <Text style={styles.resultCount}>{filteredLogs.length}</Text>
                            <Text style={styles.resultLabel}>entries</Text>
                        </View>
                    </View>

                    {/* Filter Controls */}
                    <View style={styles.filterControls}>
                        {/* Date Filter */}
                        <TouchableOpacity style={styles.dateFilterButton} onPress={handleDatePress}>
                            <View style={styles.filterIcon}>
                                <FontAwesome5 name="calendar-alt" size={16} color="#6366F1" />
                            </View>
                            <View style={styles.filterContent}>
                                <Text style={styles.filterLabel}>Date</Text>
                                <Text style={styles.filterValue}>{selectedDate}</Text>
                            </View>
                            <FontAwesome5 name="chevron-down" size={12} color="#9CA3AF" />
                        </TouchableOpacity>

                        {/* Meal Filter */}
                        <TouchableOpacity
                            style={[styles.filterButton, selectedMeal !== "All Meals" && styles.filterButtonActive]}
                            onPress={() => setShowMealDropdown(true)}
                        >
                            <View style={[styles.filterIcon, { backgroundColor: '#ECFDF5' }]}>
                                <FontAwesome5 name="utensils" size={14} color="#10B981" />
                            </View>
                            <View style={styles.filterContent}>
                                <Text style={styles.filterLabel}>Meal</Text>
                                <Text style={styles.filterValue} numberOfLines={1}>
                                    {selectedMeal === "All Meals" ? "All" : selectedMeal}
                                </Text>
                            </View>
                            <FontAwesome5 name="chevron-down" size={10} color="#9CA3AF" />
                        </TouchableOpacity>

                        {/* Active Filters Display */}
                        {selectedMeal !== "All Meals" && (
                            <View style={styles.activeFilters}>
                                <Text style={styles.activeFiltersLabel}>Active filters:</Text>
                                <View style={styles.activeFilterTags}>
                                    <View style={styles.activeFilterTag}>
                                        <Text style={styles.activeFilterTagText}>{selectedMeal}</Text>
                                        <TouchableOpacity onPress={() => setSelectedMeal("All Meals")}>
                                            <FontAwesome5 name="times" size={10} color="#6366F1" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>
                </View>

                {showDatePicker && (
                    <DateTimePicker
                        value={selectedDateObj}
                        mode="date"
                        display="default"
                        onChange={onDateChange}
                        maximumDate={new Date()}
                    />
                )}

                {/* Content Area */}
                <View style={styles.content}>
                    {filteredLogs.length > 0 ? (
                        <View style={styles.logsContainer}>
                            {filteredLogs.map((log, index) => (
                                <View key={`${log.log_id}-${index}`} style={styles.logCard}>
                                    <View style={styles.logHeader}>
                                        <View style={styles.logMeta}>
                                            <View style={[styles.mealBadge, { backgroundColor: `${getMealColor(log.log_meal)}15` }]}>
                                                <FontAwesome5 
                                                    name={getMealIcon(log.log_meal)} 
                                                    size={12} 
                                                    color={getMealColor(log.log_meal)} 
                                                />
                                                <Text style={[styles.mealBadgeText, { color: getMealColor(log.log_meal) }]}>
                                                    {cleanMealName(log.log_meal)}
                                                </Text>
                                            </View>
                                            <Text style={styles.timeText}>{log.log_time}</Text>
                                        </View>
                                        <View style={[
                                            styles.statusBadge,
                                            log.log_action === 'completed' ? styles.completedStatus : styles.editedStatus
                                        ]}>
                                            <Text style={styles.statusText}>
                                                {log.log_status || 'completed'}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.logBody}>
                                        <Text style={styles.horseName}>{horseName}</Text>
                                        <View style={styles.foodInfo}>
                                            <FontAwesome5 name="seedling" size={14} color="#10B981" />
                                            <Text style={styles.foodText}>{log.log_food}</Text>
                                            <View style={styles.amountChip}>
                                                <Text style={styles.amountText}>{log.log_amount}</Text>
                                            </View>
                                        </View>
                                    </View>

                                    <View style={styles.logFooter}>
                                        <View style={styles.userInfo}>
                                            <FontAwesome5 name="user-circle" size={12} color="#9CA3AF" />
                                            <Text style={styles.userText}>
                                                {log.log_action === 'completed' ? 'Fed by' : 'Logged by'} {getUserName(log)}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIcon}>
                                <FontAwesome5 name="clipboard-list" size={32} color="#D1D5DB" />
                            </View>
                            <Text style={styles.emptyTitle}>No feed entries found</Text>
                            <Text style={styles.emptyDescription}>
                                No feed entries for {selectedDate}
                            </Text>
                            <Text style={styles.emptySubtext}>
                                Total logs available: {logs.length}
                            </Text>
                            <Text style={styles.emptySubtext}>
                                Feed entries will appear here when horses are fed.
                            </Text>
                            {selectedMeal !== "All Meals" && (
                                <View style={styles.emptyActions}>
                                    <Text style={styles.emptyHint}>
                                        Try adjusting your filters or selecting a different date.
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Meal Dropdown Modal */}
            <Modal
                visible={showMealDropdown}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowMealDropdown(false)}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowMealDropdown(false)}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.dropdownHeader}>
                            <Text style={styles.dropdownTitle}>Select Meal</Text>
                        </View>
                        <ScrollView style={styles.dropdownScroll}>
                            {mealOptions.map((meal, index) => (
                                <TouchableOpacity
                                    key={meal}
                                    style={[
                                        styles.dropdownItem,
                                        selectedMeal === meal && styles.dropdownItemSelected,
                                        index === mealOptions.length - 1 && styles.dropdownItemLast
                                    ]}
                                    onPress={() => handleMealSelect(meal)}
                                >
                                    <View style={styles.dropdownItemContent}>
                                        <View style={[
                                            styles.mealIconWrapper,
                                            { backgroundColor: meal === "All Meals" ? "#F1F5F9" : `${getMealColor(meal)}15` }
                                        ]}>
                                            <FontAwesome5 
                                                name={meal === "All Meals" ? "list" : getMealIcon(meal)} 
                                                size={12} 
                                                color={meal === "All Meals" ? "#64748B" : getMealColor(meal)} 
                                            />
                                        </View>
                                        <Text style={[
                                            styles.dropdownItemText,
                                            selectedMeal === meal && styles.dropdownItemTextSelected
                                        ]}>
                                            {meal}
                                        </Text>
                                    </View>
                                    {selectedMeal === meal && (
                                        <View style={styles.checkIcon}>
                                            <FontAwesome5 name="check" size={12} color="#6366F1" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#F8FAFC",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 24,
        paddingVertical: 16,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "#F8FAFC",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    headerCenter: {
        flex: 1,
        marginLeft: 16,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#0F172A",
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 14,
        color: "#64748B",
        marginTop: 2,
        fontWeight: "500",
    },
    placeholder: {
        width: 40,
    },
    container: {
        flex: 1,
    },
    filterSection: {
        backgroundColor: "#FFFFFF",
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 20,
        paddingVertical: 24,
        paddingHorizontal: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        borderWidth: 1,
        borderColor: "#F1F5F9",
    },
    filterHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    filterTitleContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    filterTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#0F172A",
        marginLeft: 8,
    },
    resultBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#EEF2FF",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: "#E0E7FF",
    },
    resultCount: {
        fontSize: 18,
        fontWeight: "700",
        color: "#6366F1",
        marginRight: 4,
    },
    resultLabel: {
        fontSize: 12,
        fontWeight: "600",
        color: "#6366F1",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    filterControls: {
        gap: 16,
    },
    dateFilterButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FAFBFF",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: "#E0E7FF",
    },
    filterButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FAFBFF",
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: "#E2E8F0",
        minHeight: 64,
    },
    filterButtonActive: {
        backgroundColor: "#EEF2FF",
        borderColor: "#C7D2FE",
    },
    filterIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: "#EEF2FF",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    filterContent: {
        flex: 1,
        minWidth: 0,
    },
    filterLabel: {
        fontSize: 11,
        fontWeight: "600",
        color: "#64748B",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    filterValue: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1E293B",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    modalContent: {
        width: "100%",
        maxWidth: 400,
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
        elevation: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        maxHeight: 320,
        overflow: "hidden",
    },
    dropdownScroll: {
        maxHeight: 260,
    },
    dropdownHeader: {
        backgroundColor: "#F8FAFC",
        paddingHorizontal: 18,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
    },
    dropdownTitle: {
        fontSize: 13,
        fontWeight: "700",
        color: "#64748B",
        textTransform: "uppercase",
        letterSpacing: 0.8,
    },
    dropdownItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 18,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
        backgroundColor: "#FFFFFF",
        minHeight: 56,
    },
    dropdownItemLast: {
        borderBottomWidth: 0,
    },
    dropdownItemSelected: {
        backgroundColor: "#EEF2FF",
    },
    dropdownItemContent: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    mealIconWrapper: {
        width: 28,
        height: 28,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    dropdownItemText: {
        fontSize: 15,
        color: "#374151",
        fontWeight: "500",
        flex: 1,
    },
    dropdownItemTextSelected: {
        color: "#6366F1",
        fontWeight: "600",
    },
    checkIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "#EEF2FF",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#C7D2FE",
    },
    activeFilters: {
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: "#F1F5F9",
    },
    activeFiltersLabel: {
        fontSize: 12,
        fontWeight: "600",
        color: "#64748B",
        marginBottom: 8,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    activeFilterTags: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    activeFilterTag: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#EEF2FF",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#C7D2FE",
    },
    activeFilterTagText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#6366F1",
        marginRight: 8,
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 32,
    },
    logsContainer: {
        gap: 16,
    },
    logCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: "#F1F5F9",
    },
    logHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    logMeta: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    mealBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 24,
        marginRight: 12,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.05)",
    },
    mealBadgeText: {
        fontSize: 12,
        fontWeight: "700",
        marginLeft: 6,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    timeText: {
        fontSize: 13,
        color: "#64748B",
        fontWeight: "600",
    },
    statusBadge: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 24,
        borderWidth: 1,
    },
    completedStatus: {
        backgroundColor: "#DCFCE7",
        borderColor: "#BBF7D0",
    },
    editedStatus: {
        backgroundColor: "#FEF3C7",
        borderColor: "#FDE68A",
    },
    statusText: {
        fontSize: 11,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        color: "#059669",
    },
    logBody: {
        marginBottom: 16,
    },
    horseName: {
        fontSize: 20,
        fontWeight: "700",
        color: "#0F172A",
        marginBottom: 12,
        letterSpacing: -0.3,
    },
    foodInfo: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F0FDF4",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#BBF7D0",
    },
    foodText: {
        fontSize: 14,
        color: "#059669",
        fontWeight: "600",
        marginLeft: 12,
        flex: 1,
    },
    amountChip: {
        backgroundColor: "#059669",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    amountText: {
        fontSize: 12,
        color: "#FFFFFF",
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    logFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: "#F1F5F9",
    },
    userInfo: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    userText: {
        fontSize: 12,
        color: "#64748B",
        marginLeft: 8,
        fontWeight: "500",
    },
    timestampText: {
        fontSize: 12,
        color: "#94A3B8",
        fontWeight: "500",
    },
    emptyState: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 80,
        paddingHorizontal: 32,
    },
    emptyIcon: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: "#F8FAFC",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 24,
        borderWidth: 2,
        borderColor: "#E2E8F0",
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: "700",
        color: "#374151",
        textAlign: "center",
        marginBottom: 8,
        letterSpacing: -0.3,
    },
    emptyDescription: {
        fontSize: 16,
        color: "#64748B",
        textAlign: "center",
        marginBottom: 8,
        fontWeight: "500",
    },
    emptySubtext: {
        fontSize: 14,
        color: "#94A3B8",
        textAlign: "center",
        lineHeight: 20,
        marginBottom: 16,
        maxWidth: 280,
    },
    emptyActions: {
        alignItems: "center",
    },
    emptyHint: {
        fontSize: 13,
        color: "#64748B",
        textAlign: "center",
        fontStyle: "italic",
        maxWidth: 240,
        fontWeight: "500",
    },
});