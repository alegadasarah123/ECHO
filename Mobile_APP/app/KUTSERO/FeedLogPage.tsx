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
    Alert,
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
    onClearLogs?: () => void;
}

export default function FeedLogPage({ 
    onBack, 
    logs, 
    horseName, 
    onRefresh,
    onClearLogs 
}: FeedLogPageProps) {
    const [feedLogs, setFeedLogs] = useState<FeedLog[]>(logs);
    const [filteredLogs, setFilteredLogs] = useState<FeedLog[]>(logs);
    const [refreshing, setRefreshing] = useState(false);
    
    // Filter states
    const [showFilters, setShowFilters] = useState(false);
    const [selectedDateFrom, setSelectedDateFrom] = useState<Date | null>(null);
    const [selectedDateTo, setSelectedDateTo] = useState<Date | null>(null);
    const [selectedMeal, setSelectedMeal] = useState<string>('all');
    
    // Temp states for modal
    const [tempDateFrom, setTempDateFrom] = useState<Date | null>(null);
    const [tempDateTo, setTempDateTo] = useState<Date | null>(null);
    const [tempMeal, setTempMeal] = useState<string>('all');
    
    // Date picker states
    const [showFromDatePicker, setShowFromDatePicker] = useState(false);
    const [showToDatePicker, setShowToDatePicker] = useState(false);
    
    // Dropdown states
    const [showMealDropdown, setShowMealDropdown] = useState(false);

    const mealOptions = ['all', 'Breakfast', 'Lunch', 'Dinner'];

    // Update logs when props change
    useEffect(() => {
        setFeedLogs(logs);
        setFilteredLogs(logs);
    }, [logs]);

    // Apply filters
    const applyFilters = React.useCallback(() => {
        let filtered = [...feedLogs];

        if (selectedMeal !== 'all') {
            filtered = filtered.filter(log => cleanMealName(log.log_meal) === selectedMeal);
        }

        if (selectedDateFrom) {
            const fromDate = new Date(selectedDateFrom);
            fromDate.setHours(0, 0, 0, 0);
            filtered = filtered.filter(log => {
                const logDate = new Date(log.log_date || log.created_at);
                logDate.setHours(0, 0, 0, 0);
                return logDate >= fromDate;
            });
        }

        if (selectedDateTo) {
            const toDate = new Date(selectedDateTo);
            toDate.setHours(23, 59, 59, 999);
            filtered = filtered.filter(log => {
                const logDate = new Date(log.log_date || log.created_at);
                return logDate <= toDate;
            });
        }

        setFilteredLogs(filtered);
    }, [feedLogs, selectedMeal, selectedDateFrom, selectedDateTo]);

    useEffect(() => {
        applyFilters();
    }, [applyFilters]);

    const handleApplyFilters = () => {
        setSelectedMeal(tempMeal);
        setSelectedDateFrom(tempDateFrom);
        setSelectedDateTo(tempDateTo);
        setShowFilters(false);
    };

    const handleResetFilters = () => {
        setTempMeal('all');
        setTempDateFrom(null);
        setTempDateTo(null);
        setSelectedMeal('all');
        setSelectedDateFrom(null);
        setSelectedDateTo(null);
        setShowFilters(false);
    };

    const getActiveFilterCount = () => {
        let count = 0;
        if (selectedMeal !== 'all') count++;
        if (selectedDateFrom) count++;
        if (selectedDateTo) count++;
        return count;
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await onRefresh();
        setRefreshing(false);
    };

    const handleClearLogs = () => {
        Alert.alert(
            'Clear All Logs',
            'Are you sure you want to clear all feed logs? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: () => {
                        if (onClearLogs) {
                            onClearLogs();
                            setFeedLogs([]);
                            setFilteredLogs([]);
                        }
                    }
                }
            ]
        );
    };

    const formatDate = (dateInput: string | Date): string => {
        try {
            const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } catch {
            return typeof dateInput === 'string' ? dateInput : 'Invalid Date';
        }
    };

    const formatTimestamp = (timestampString: string): string => {
        try {
            const date = new Date(timestampString);
            return date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        } catch {
            return timestampString;
        }
    };

    const cleanMealName = (meal: string) => {
        return meal ? meal.replace(/^\?/, '') : '';
    };

    const getMealIcon = (meal: string): string => {
        const cleanMeal = cleanMealName(meal);
        switch (cleanMeal) {
            case 'Breakfast': return 'sun';
            case 'Lunch': return 'cloud-sun';
            case 'Dinner': return 'moon';
            default: return 'utensils';
        }
    };

    const getMealColor = (meal: string): string => {
        const cleanMeal = cleanMealName(meal);
        switch (cleanMeal) {
            case 'Breakfast': return '#F59E0B';
            case 'Lunch': return '#10B981';
            case 'Dinner': return '#8B5CF6';
            default: return '#6B7280';
        }
    };

    const getUserName = (log: FeedLog) => {
        return log.log_kutsero_full_name || log.log_user_full_name || 'Unknown User';
    };

    // Date picker handlers
    const handleFromDateChange = (event: any, selectedDate?: Date) => {
        setShowFromDatePicker(false);
        if (selectedDate) {
            setTempDateFrom(selectedDate);
        }
    };

    const handleToDateChange = (event: any, selectedDate?: Date) => {
        setShowToDatePicker(false);
        if (selectedDate) {
            setTempDateTo(selectedDate);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <FontAwesome5 name="arrow-left" size={20} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <FontAwesome5 name="clipboard-list" size={20} color="#fff" />
                    <Text style={styles.headerTitle}>Feed Logs</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity 
                        style={[styles.filterButton, getActiveFilterCount() > 0 && styles.filterButtonActive]} 
                        onPress={() => {
                            setTempMeal(selectedMeal);
                            setTempDateFrom(selectedDateFrom);
                            setTempDateTo(selectedDateTo);
                            setShowFilters(true);
                        }}
                    >
                        <FontAwesome5 name="filter" size={14} color="#fff" />
                        {getActiveFilterCount() > 0 && (
                            <View style={styles.filterBadge}>
                                <Text style={styles.filterBadgeText}>{getActiveFilterCount()}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    {onClearLogs && (
                        <TouchableOpacity 
                            style={styles.clearButton} 
                            onPress={handleClearLogs}
                            disabled={feedLogs.length === 0}
                        >
                            <FontAwesome5 name="trash" size={14} color="#fff" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <ScrollView 
                style={styles.container}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        colors={['#3B82F6']}
                        tintColor="#3B82F6"
                    />
                }
            >
                <View style={styles.content}>
                    {/* Stats Container */}
                    <View style={styles.statsContainer}>
                        <View style={styles.statCard}>
                            <Text style={styles.statNumber}>{filteredLogs.length}</Text>
                            <Text style={styles.statLabel}>
                                {getActiveFilterCount() > 0 ? 'Filtered Entries' : 'Total Entries'}
                            </Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statNumber}>
                                {filteredLogs.filter(log => log.log_status === 'Fed').length}
                            </Text>
                            <Text style={styles.statLabel}>Feedings Given</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statNumber}>1</Text>
                            <Text style={styles.statLabel}>Horse</Text>
                        </View>
                    </View>

                    {/* Active Filters Display */}
                    {getActiveFilterCount() > 0 && (
                        <View style={styles.activeFiltersContainer}>
                            <Text style={styles.activeFiltersTitle}>Active Filters:</Text>
                            <View style={styles.activeFiltersList}>
                                {selectedMeal !== 'all' && (
                                    <View style={styles.activeFilterTag}>
                                        <Text style={styles.activeFilterText}>Meal: {selectedMeal}</Text>
                                    </View>
                                )}
                                {selectedDateFrom && (
                                    <View style={styles.activeFilterTag}>
                                        <Text style={styles.activeFilterText}>From: {formatDate(selectedDateFrom)}</Text>
                                    </View>
                                )}
                                {selectedDateTo && (
                                    <View style={styles.activeFilterTag}>
                                        <Text style={styles.activeFilterText}>To: {formatDate(selectedDateTo)}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}

                    {/* Empty State or Logs */}
                    {filteredLogs.length === 0 ? (
                        <View style={styles.emptyState}>
                            <FontAwesome5 name="utensils" size={64} color="#E5E7EB" />
                            <Text style={styles.emptyStateTitle}>
                                {getActiveFilterCount() > 0 ? 'No Matching Logs' : 'No Feed Logs'}
                            </Text>
                            <Text style={styles.emptyStateSubtitle}>
                                {getActiveFilterCount() > 0 
                                    ? 'Try adjusting your filters to see more results.'
                                    : 'Feed logs will appear here when horses are fed.'
                                }
                            </Text>
                            {getActiveFilterCount() > 0 && (
                                <TouchableOpacity 
                                    style={styles.clearFiltersButton} 
                                    onPress={handleResetFilters}
                                >
                                    <Text style={styles.clearFiltersButtonText}>Clear Filters</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : (
                        <View style={styles.logsContainer}>
                            {filteredLogs.map((log, index) => (
                                <View key={`${log.log_id}-${index}`} style={styles.logCard}>
                                    <View style={styles.logHeader}>
                                        <View style={styles.logHeaderLeft}>
                                            <View style={[styles.mealIndicator, { backgroundColor: getMealColor(log.log_meal) }]}>
                                                <FontAwesome5 name={getMealIcon(log.log_meal)} size={16} color="#fff" />
                                            </View>
                                            <View style={styles.logHeaderInfo}>
                                                <Text style={styles.horseName}>{horseName}</Text>
                                                <Text style={styles.logDate}>{formatDate(log.log_date || log.created_at)}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.logHeaderRight}>
                                            <Text style={styles.logTimestamp}>{formatTimestamp(log.created_at)}</Text>
                                            <View style={[styles.statusBadge, { backgroundColor: '#ECFDF5' }]}>
                                                <Text style={[styles.statusText, { color: '#059669' }]}>{log.log_status}</Text>
                                            </View>
                                        </View>
                                    </View>

                                    <View style={styles.logContent}>
                                        <View style={styles.logDetails}>
                                            <View style={styles.logDetailRow}>
                                                <FontAwesome5 name="clock" size={14} color="#6B7280" />
                                                <Text style={styles.logDetailText}>{cleanMealName(log.log_meal)} - {log.log_time}</Text>
                                            </View>
                                            <View style={styles.logDetailRow}>
                                                <FontAwesome5 name="seedling" size={14} color="#10B981" />
                                                <Text style={styles.logDetailText}>{log.log_food}</Text>
                                            </View>
                                            <View style={styles.logDetailRow}>
                                                <FontAwesome5 name="weight" size={14} color="#3B82F6" />
                                                <Text style={styles.logDetailText}>{log.log_amount}</Text>
                                            </View>
                                            <View style={styles.logDetailRow}>
                                                <FontAwesome5 name="user" size={14} color="#6B7280" />
                                                <Text style={styles.logDetailText}>by {getUserName(log)}</Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Filter Modal */}
            <Modal
                visible={showFilters}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowFilters(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHeaderLeft}>
                                <FontAwesome5 name="filter" size={20} color="#3B82F6" />
                                <Text style={styles.modalTitle}>Filter Feed Logs</Text>
                            </View>
                            <TouchableOpacity 
                                style={styles.modalCloseButton}
                                onPress={() => setShowFilters(false)}
                            >
                                <FontAwesome5 name="times" size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                            {/* Meal Filter */}
                            <View style={[styles.filterSection, { zIndex: 100 }]}>
                                <View style={styles.filterSectionHeader}>
                                    <FontAwesome5 name="utensils" size={16} color="#3B82F6" />
                                    <Text style={styles.filterLabel}>Filter by Meal</Text>
                                </View>
                                
                                <View style={styles.mealDropdownContainer}>
                                    {showMealDropdown && (
                                        <TouchableOpacity
                                            style={styles.dropdownOverlay}
                                            activeOpacity={1}
                                            onPress={() => setShowMealDropdown(false)}
                                        />
                                    )}
                                    
                                    <TouchableOpacity
                                        style={[styles.mealDropdownButton, tempMeal !== 'all' && styles.mealDropdownButtonSelected]}
                                        onPress={() => setShowMealDropdown(!showMealDropdown)}
                                    >
                                        <View style={styles.mealDropdownButtonContent}>
                                            <FontAwesome5 
                                                name={tempMeal === 'all' ? 'globe' : getMealIcon(tempMeal)} 
                                                size={16} 
                                                color={tempMeal !== 'all' ? getMealColor(tempMeal) : '#6B7280'} 
                                            />
                                            <Text style={[
                                                styles.mealDropdownText, 
                                                tempMeal !== 'all' && styles.mealDropdownTextSelected
                                            ]}>
                                                {tempMeal === 'all' ? 'All Meals' : tempMeal}
                                            </Text>
                                        </View>
                                        <FontAwesome5 
                                            name={showMealDropdown ? 'chevron-up' : 'chevron-down'} 
                                            size={14} 
                                            color="#6B7280" 
                                        />
                                    </TouchableOpacity>

                                    {showMealDropdown && (
                                        <View style={styles.mealDropdownList}>
                                            {mealOptions.map((meal, index) => (
                                                <TouchableOpacity
                                                    key={meal}
                                                    style={[
                                                        styles.mealDropdownOption,
                                                        tempMeal === meal && styles.mealDropdownOptionSelected
                                                    ]}
                                                    onPress={() => {
                                                        setTempMeal(meal);
                                                        setShowMealDropdown(false);
                                                    }}
                                                >
                                                    <FontAwesome5 
                                                        name={meal === 'all' ? 'globe' : getMealIcon(meal)} 
                                                        size={14} 
                                                        color={meal === 'all' ? '#6B7280' : getMealColor(meal)} 
                                                    />
                                                    <Text style={[
                                                        styles.mealDropdownOptionText,
                                                        tempMeal === meal && styles.mealDropdownOptionTextSelected
                                                    ]}>
                                                        {meal === 'all' ? 'All Meals' : meal}
                                                    </Text>
                                                    {tempMeal === meal && (
                                                        <FontAwesome5 name="check" size={14} color="#3B82F6" />
                                                    )}
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* Date Range Filter */}
                            <View style={styles.filterSection}>
                                <View style={styles.filterSectionHeader}>
                                    <FontAwesome5 name="calendar-alt" size={16} color="#3B82F6" />
                                    <Text style={styles.filterLabel}>Filter by Date Range</Text>
                                </View>
                                
                                <View style={styles.dateFilterContainer}>
                                    <View style={styles.dateFilterItem}>
                                        <View style={styles.dateFilterItemHeader}>
                                            <FontAwesome5 name="calendar-plus" size={14} color="#059669" />
                                            <Text style={styles.dateFilterLabel}>From Date</Text>
                                        </View>
                                        <View style={styles.dateButtonContainer}>
                                            <TouchableOpacity
                                                style={[styles.datePickerButton, tempDateFrom && styles.datePickerButtonFilled]}
                                                onPress={() => {
                                                    setShowFromDatePicker(true);
                                                    setShowMealDropdown(false);
                                                }}
                                            >
                                                <FontAwesome5 name="calendar" size={16} color={tempDateFrom ? "#3B82F6" : "#9CA3AF"} />
                                                <Text style={[
                                                    styles.datePickerText,
                                                    tempDateFrom && styles.datePickerTextFilled
                                                ]}>
                                                    {tempDateFrom ? formatDate(tempDateFrom) : 'Select start date'}
                                                </Text>
                                                {tempDateFrom && (
                                                    <TouchableOpacity
                                                        style={styles.clearDateButton}
                                                        onPress={(e) => {
                                                            e.stopPropagation();
                                                            setTempDateFrom(null);
                                                        }}
                                                    >
                                                        <FontAwesome5 name="times-circle" size={16} color="#EF4444" />
                                                    </TouchableOpacity>
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                    
                                    <View style={styles.dateFilterSeparator}>
                                        <FontAwesome5 name="arrow-right" size={14} color="#9CA3AF" />
                                    </View>
                                    
                                    <View style={styles.dateFilterItem}>
                                        <View style={styles.dateFilterItemHeader}>
                                            <FontAwesome5 name="calendar-minus" size={14} color="#DC2626" />
                                            <Text style={styles.dateFilterLabel}>To Date</Text>
                                        </View>
                                        <View style={styles.dateButtonContainer}>
                                            <TouchableOpacity
                                                style={[styles.datePickerButton, tempDateTo && styles.datePickerButtonFilled]}
                                                onPress={() => {
                                                    setShowToDatePicker(true);
                                                    setShowMealDropdown(false);
                                                }}
                                            >
                                                <FontAwesome5 name="calendar" size={16} color={tempDateTo ? "#3B82F6" : "#9CA3AF"} />
                                                <Text style={[
                                                    styles.datePickerText,
                                                    tempDateTo && styles.datePickerTextFilled
                                                ]}>
                                                    {tempDateTo ? formatDate(tempDateTo) : 'Select end date'}
                                                </Text>
                                                {tempDateTo && (
                                                    <TouchableOpacity
                                                        style={styles.clearDateButton}
                                                        onPress={(e) => {
                                                            e.stopPropagation();
                                                            setTempDateTo(null);
                                                        }}
                                                    >
                                                        <FontAwesome5 name="times-circle" size={16} color="#EF4444" />
                                                    </TouchableOpacity>
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                                
                                <View style={styles.dateHintContainer}>
                                    <FontAwesome5 name="info-circle" size={12} color="#6B7280" />
                                    <Text style={styles.dateHint}>
                                        Tap the calendar buttons above to select dates
                                    </Text>
                                </View>
                            </View>

                            {/* Filter Preview Section */}
                            <View style={styles.filterPreviewSection}>
                                <Text style={styles.filterPreviewTitle}>Filter Preview:</Text>
                                <View style={styles.filterPreviewContainer}>
                                    {tempMeal !== 'all' ? (
                                        <View style={styles.filterPreviewTag}>
                                            <FontAwesome5 name="utensils" size={12} color="#ffffff" />
                                            <Text style={styles.filterPreviewText}>{tempMeal}</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.filterPreviewTagInactive}>
                                            <Text style={styles.filterPreviewTextInactive}>All Meals</Text>
                                        </View>
                                    )}

                                    {tempDateFrom ? (
                                        <View style={styles.filterPreviewTag}>
                                            <FontAwesome5 name="calendar-plus" size={12} color="#ffffff" />
                                            <Text style={styles.filterPreviewText}>From: {formatDate(tempDateFrom)}</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.filterPreviewTagInactive}>
                                            <Text style={styles.filterPreviewTextInactive}>No start date</Text>
                                        </View>
                                    )}

                                    {tempDateTo ? (
                                        <View style={styles.filterPreviewTag}>
                                            <FontAwesome5 name="calendar-minus" size={12} color="#ffffff" />
                                            <Text style={styles.filterPreviewText}>To: {formatDate(tempDateTo)}</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.filterPreviewTagInactive}>
                                            <Text style={styles.filterPreviewTextInactive}>No end date</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.resetButton}
                                onPress={() => {
                                    setTempMeal('all');
                                    setTempDateFrom(null);
                                    setTempDateTo(null);
                                }}
                            >
                                <FontAwesome5 name="undo" size={14} color="#6B7280" />
                                <Text style={styles.resetButtonText}>Reset</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                style={styles.applyButton}
                                onPress={handleApplyFilters}
                            >
                                <FontAwesome5 name="check" size={14} color="#fff" />
                                <Text style={styles.applyButtonText}>Apply Filters</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Date Pickers - Now with higher zIndex and positioned above modal */}
            {(showFromDatePicker || showToDatePicker) && (
                <View style={styles.datePickerOverlay}>
                    {showFromDatePicker && (
                        <View style={styles.datePickerModalContainer}>
                            <DateTimePicker
                                value={tempDateFrom || new Date()}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={handleFromDateChange}
                                maximumDate={new Date()}
                            />
                            {Platform.OS === 'ios' && (
                                <TouchableOpacity
                                    style={styles.datePickerDoneButton}
                                    onPress={() => setShowFromDatePicker(false)}
                                >
                                    <Text style={styles.datePickerDoneButtonText}>Done</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                    
                    {showToDatePicker && (
                        <View style={styles.datePickerModalContainer}>
                            <DateTimePicker
                                value={tempDateTo || new Date()}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={handleToDateChange}
                                maximumDate={new Date()}
                                minimumDate={tempDateFrom || undefined}
                            />
                            {Platform.OS === 'ios' && (
                                <TouchableOpacity
                                    style={styles.datePickerDoneButton}
                                    onPress={() => setShowToDatePicker(false)}
                                >
                                    <Text style={styles.datePickerDoneButtonText}>Done</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#CD853F',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 18,
        backgroundColor: '#CD853F',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCenter: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
        marginHorizontal: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
        marginLeft: 8,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        position: 'relative',
    },
    filterButtonActive: {
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
    },
    filterBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#EF4444',
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '600',
    },
    clearButton: {
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
    },
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    content: {
        padding: 20,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    statNumber: {
        fontSize: 24,
        fontWeight: '700',
        color: '#3B82F6',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#6B7280',
        textAlign: 'center',
        fontWeight: '500',
    },
    activeFiltersContainer: {
        backgroundColor: '#EFF6FF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#DBEAFE',
    },
    activeFiltersTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1E40AF',
        marginBottom: 8,
    },
    activeFiltersList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    activeFilterTag: {
        backgroundColor: '#3B82F6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    activeFilterText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '500',
    },
    clearFiltersButton: {
        backgroundColor: '#3B82F6',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
        marginTop: 16,
    },
    clearFiltersButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyStateTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#374151',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyStateSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 20,
    },
    logsContainer: {
        gap: 12,
    },
    logCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    logHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    logHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    mealIndicator: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    logHeaderInfo: {
        flex: 1,
    },
    horseName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 2,
    },
    logDate: {
        fontSize: 12,
        color: '#6B7280',
    },
    logHeaderRight: {
        alignItems: 'flex-end',
    },
    logTimestamp: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    logContent: {
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        paddingTop: 12,
    },
    logDetails: {
        gap: 8,
    },
    logDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    logDetailText: {
        fontSize: 14,
        color: '#4B5563',
        fontWeight: '500',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '85%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.25,
        shadowRadius: 25,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        backgroundColor: '#FAFBFC',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    modalHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
    },
    modalCloseButton: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 18,
        backgroundColor: '#F3F4F6',
    },
    modalContent: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 10,
    },
    filterSection: {
        marginBottom: 24,
        zIndex: 1,
    },
    filterSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    filterLabel: {
        fontSize: 18,
        fontWeight: '600',
        color: '#374151',
    },
    mealDropdownContainer: {
        position: 'relative',
        zIndex: 1000,
    },
    dropdownOverlay: {
        position: 'absolute',
        top: 0,
        left: -24,
        right: -24,
        bottom: -300,
        zIndex: 998,
    },
    mealDropdownButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderRadius: 12,
        backgroundColor: '#F9FAFB',
        borderWidth: 2,
        borderColor: '#E5E7EB',
        minHeight: 56,
        zIndex: 1000,
    },
    mealDropdownButtonSelected: {
        backgroundColor: '#EFF6FF',
        borderColor: '#3B82F6',
    },
    mealDropdownButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    mealDropdownText: {
        fontSize: 16,
        color: '#4B5563',
        fontWeight: '500',
        flex: 1,
    },
    mealDropdownTextSelected: {
        color: '#3B82F6',
        fontWeight: '600',
    },
    mealDropdownList: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
        marginTop: 4,
        zIndex: 1001,
    },
    mealDropdownOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        gap: 12,
    },
    mealDropdownOptionSelected: {
        backgroundColor: '#EFF6FF',
    },
    mealDropdownOptionText: {
        fontSize: 15,
        color: '#4B5563',
        fontWeight: '500',
        flex: 1,
    },
    mealDropdownOptionTextSelected: {
        color: '#3B82F6',
        fontWeight: '600',
    },
    dateFilterContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 16,
    },
    dateFilterItem: {
        flex: 1,
    },
    dateFilterItemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    dateFilterLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    dateFilterSeparator: {
        paddingBottom: 16,
        paddingHorizontal: 8,
    },
    dateButtonContainer: {
        position: 'relative',
    },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: '#fff',
        minHeight: 52,
        paddingRight: 48,
    },
    datePickerButtonFilled: {
        borderColor: '#3B82F6',
        backgroundColor: '#EFF6FF',
    },
    datePickerText: {
        fontSize: 16,
        color: '#9CA3AF',
        fontWeight: '500',
        flex: 1,
    },
    datePickerTextFilled: {
        color: '#1F2937',
        fontWeight: '600',
    },
    clearDateButton: {
        position: 'absolute',
        right: 12,
        top: '50%',
        transform: [{ translateY: -8 }],
        padding: 4,
        borderRadius: 12,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    dateHintContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 12,
        paddingHorizontal: 4,
    },
    dateHint: {
        fontSize: 12,
        color: '#6B7280',
        fontStyle: 'italic',
        flex: 1,
    },
    filterPreviewSection: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 16,
        marginTop: 8,
        marginBottom: 40,
    },
    filterPreviewTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12,
    },
    filterPreviewContainer: {
        gap: 8,
    },
    filterPreviewTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#3B82F6',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    filterPreviewTagInactive: {
        backgroundColor: '#E5E7EB',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    filterPreviewText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '500',
    },
    filterPreviewTextInactive: {
        color: '#6B7280',
        fontSize: 13,
        fontWeight: '500',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        gap: 16,
        backgroundColor: '#FAFBFC',
    },
    resetButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        borderRadius: 12,
        backgroundColor: '#F9FAFB',
        borderWidth: 2,
        borderColor: '#D1D5DB',
    },
    resetButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#4B5563',
    },
    applyButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        borderRadius: 12,
        backgroundColor: '#3B82F6',
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    applyButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    // New styles for date picker overlay
    datePickerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    },
    datePickerModalContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        margin: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },
    datePickerDoneButton: {
        backgroundColor: '#3B82F6',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 16,
        alignItems: 'center',
    },
    datePickerDoneButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});