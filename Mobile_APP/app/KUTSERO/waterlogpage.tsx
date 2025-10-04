import { useState } from "react";
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, SafeAreaView } from "react-native";
import { FontAwesome5 } from '@expo/vector-icons';

interface WaterLog {
  log_id: string;
  log_kutsero_full_name: string;
  log_date: string;
  log_period: string;
  log_time: string;
  log_amount: string;
  log_status: string;
  log_action: string;
  created_at: string;
  horse_name: string;
}

interface WaterLogPageProps {
  onBack: () => void;
  logs: WaterLog[];
  horseName: string;
  onRefresh: () => void;
}

export default function WaterLogPage({ onBack, logs, horseName, onRefresh }: WaterLogPageProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('All Periods');
  
  const periods = ['All Periods', 'Morning', 'Afternoon', 'Evening'];

  const getPeriodIcon = (period: string): string => {
    switch (period) {
      case 'Morning': return 'sun';
      case 'Afternoon': return 'cloud-sun';
      case 'Evening': return 'moon';
      default: return 'tint';
    }
  };

  const getPeriodColor = (period: string): string => {
    switch (period) {
      case 'Morning': return '#F59E0B';
      case 'Afternoon': return '#3B82F6';
      case 'Evening': return '#6366F1';
      default: return '#06B6D4';
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    }
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const filteredLogs = selectedPeriod === 'All Periods' 
    ? logs 
    : logs.filter(log => log.log_period === selectedPeriod);

  // Group logs by date
  const groupedLogs = filteredLogs.reduce((groups, log) => {
    const date = log.log_date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(log);
    return groups;
  }, {} as Record<string, WaterLog[]>);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#06B6D4" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <FontAwesome5 name="clipboard-list" size={20} color="#fff" />
          <Text style={styles.headerTitle}>Water Log</Text>
        </View>
        
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <FontAwesome5 name="sync-alt" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {periods.map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.filterButton,
                selectedPeriod === period && styles.filterButtonActive
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              {period !== 'All Periods' && (
                <FontAwesome5 
                  name={getPeriodIcon(period)} 
                  size={14} 
                  color={selectedPeriod === period ? '#fff' : '#64748B'} 
                  style={styles.filterIcon}
                />
              )}
              <Text style={[
                styles.filterButtonText,
                selectedPeriod === period && styles.filterButtonTextActive
              ]}>
                {period}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <View style={[styles.statIconContainer, { backgroundColor: '#DBEAFE' }]}>
                <FontAwesome5 name="tint" size={20} color="#3B82F6" />
              </View>
              <Text style={styles.statValue}>{filteredLogs.length}</Text>
              <Text style={styles.statLabel}>Total Watering</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={[styles.statIconContainer, { backgroundColor: '#DCFCE7' }]}>
                <FontAwesome5 name="check-circle" size={20} color="#10B981" />
              </View>
              <Text style={styles.statValue}>
                {filteredLogs.filter(log => log.log_status === 'Completed').length}
              </Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>

          {Object.keys(groupedLogs).length === 0 ? (
            <View style={styles.emptyContainer}>
              <FontAwesome5 name="clipboard-list" size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No water logs found</Text>
              <Text style={styles.emptySubtitle}>
                Water logs will appear here once you mark water schedules as given
              </Text>
            </View>
          ) : (
            Object.entries(groupedLogs)
              .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
              .map(([date, dateLogs]) => (
                <View key={date} style={styles.dateSection}>
                  <View style={styles.dateSectionHeader}>
                    <FontAwesome5 name="calendar-day" size={14} color="#64748B" />
                    <Text style={styles.dateText}>{formatDate(date)}</Text>
                    <View style={styles.dateLine} />
                  </View>
                  
                  {dateLogs.map((log) => (
                    <View key={log.log_id} style={styles.logCard}>
                      <View style={styles.logHeader}>
                        <View style={styles.logHeaderLeft}>
                          <View style={[
                            styles.periodIndicator, 
                            { backgroundColor: getPeriodColor(log.log_period) }
                          ]}>
                            <FontAwesome5 
                              name={getPeriodIcon(log.log_period)} 
                              size={12} 
                              color="#fff" 
                            />
                          </View>
                          <View>
                            <Text style={styles.logPeriod}>{log.log_period}</Text>
                            <Text style={styles.logScheduledTime}>{log.log_time}</Text>
                          </View>
                        </View>
                        <View style={styles.statusBadge}>
                          <View style={styles.statusIconContainer}>
                            <FontAwesome5 name="check" size={10} color="#fff" />
                          </View>
                          <Text style={styles.statusText}>{log.log_status}</Text>
                        </View>
                      </View>
                      
                      <View style={styles.logDivider} />
                      
                      <View style={styles.logDetails}>
                        <View style={styles.logDetailRow}>
                          <FontAwesome5 name="tint" size={14} color="#06B6D4" />
                          <Text style={styles.logDetailLabel}>Amount:</Text>
                          <Text style={styles.logDetailValue}>{log.log_amount}</Text>
                        </View>
                        
                        <View style={styles.logDetailRow}>
                          <FontAwesome5 name="user" size={14} color="#8B5A2B" />
                          <Text style={styles.logDetailLabel}>Given by:</Text>
                          <Text style={styles.logDetailValue}>{log.log_kutsero_full_name}</Text>
                        </View>
                        
                        <View style={styles.logDetailRow}>
                          <FontAwesome5 name="clock" size={14} color="#64748B" />
                          <Text style={styles.logDetailLabel}>Time:</Text>
                          <Text style={styles.logDetailValue}>{formatTime(log.created_at)}</Text>
                        </View>
                      </View>
                      
                      <View style={styles.logFooter}>
                        <View style={styles.actionBadge}>
                          <FontAwesome5 name="check-double" size={10} color="#10B981" />
                          <Text style={styles.actionText}>{log.log_action}</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#06B6D4' },
  
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingVertical: 18, 
    backgroundColor: '#06B6D4', 
    elevation: 4, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.15, 
    shadowRadius: 4 
  },
  backButton: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: 'rgba(255, 255, 255, 0.15)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  headerCenter: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flex: 1, 
    justifyContent: 'center', 
    marginHorizontal: 16 
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#fff', 
    marginLeft: 8 
  },
  refreshButton: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: 'rgba(255, 255, 255, 0.15)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  
  filterContainer: { 
    backgroundColor: '#FFFFFF', 
    paddingVertical: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#E2E8F0' 
  },
  filterScrollContent: { 
    paddingHorizontal: 20, 
    gap: 10 
  },
  filterButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 20, 
    backgroundColor: '#F1F5F9', 
    borderWidth: 2, 
    borderColor: '#E2E8F0' 
  },
  filterButtonActive: { 
    backgroundColor: '#06B6D4', 
    borderColor: '#06B6D4' 
  },
  filterIcon: { 
    marginRight: 6 
  },
  filterButtonText: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#64748B' 
  },
  filterButtonTextActive: { 
    color: '#fff' 
  },
  
  container: { 
    flex: 1, 
    backgroundColor: '#F8FAFC' 
  },
  content: { 
    padding: 20 
  },
  
  statsCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 16, 
    padding: 20, 
    marginBottom: 24, 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    alignItems: 'center', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.04, 
    shadowRadius: 8, 
    elevation: 2 
  },
  statItem: { 
    alignItems: 'center', 
    flex: 1 
  },
  statIconContainer: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  statValue: { 
    fontSize: 24, 
    fontWeight: '700', 
    color: '#1E293B', 
    marginBottom: 4 
  },
  statLabel: { 
    fontSize: 12, 
    color: '#64748B', 
    fontWeight: '500' 
  },
  statDivider: { 
    width: 1, 
    height: 60, 
    backgroundColor: '#E2E8F0' 
  },
  
  dateSection: { 
    marginBottom: 24 
  },
  dateSectionHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  dateText: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#475569', 
    marginLeft: 8, 
    marginRight: 12 
  },
  dateLine: { 
    flex: 1, 
    height: 1, 
    backgroundColor: '#E2E8F0' 
  },
  
  logCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 12, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.04, 
    shadowRadius: 8, 
    elevation: 2 
  },
  logHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  logHeaderLeft: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flex: 1 
  },
  periodIndicator: { 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12 
  },
  logPeriod: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#1E293B', 
    marginBottom: 2 
  },
  logScheduledTime: { 
    fontSize: 13, 
    color: '#64748B', 
    fontWeight: '500' 
  },
  statusBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#DCFCE7', 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 16 
  },
  statusIconContainer: { 
    backgroundColor: '#10B981', 
    borderRadius: 8, 
    width: 16, 
    height: 16, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 5 
  },
  statusText: { 
    color: '#065F46', 
    fontSize: 12, 
    fontWeight: '600' 
  },
  
  logDivider: { 
    height: 1, 
    backgroundColor: '#F1F5F9', 
    marginVertical: 12 
  },
  
  logDetails: { 
    gap: 10 
  },
  logDetailRow: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  logDetailLabel: { 
    fontSize: 14, 
    color: '#64748B', 
    fontWeight: '500', 
    marginLeft: 8, 
    marginRight: 6 
  },
  logDetailValue: { 
    fontSize: 14, 
    color: '#1E293B', 
    fontWeight: '600', 
    flex: 1 
  },
  
  logFooter: { 
    marginTop: 12, 
    paddingTop: 12, 
    borderTopWidth: 1, 
    borderTopColor: '#F1F5F9' 
  },
  actionBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    alignSelf: 'flex-start', 
    backgroundColor: '#F0FDF4', 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 12 
  },
  actionText: { 
    color: '#15803D', 
    fontSize: 12, 
    fontWeight: '600', 
    marginLeft: 6 
  },
  
  emptyContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingVertical: 60 
  },
  emptyTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#374151', 
    marginTop: 16, 
    marginBottom: 8 
  },
  emptySubtitle: { 
    fontSize: 16, 
    color: '#64748B', 
    textAlign: 'center', 
    lineHeight: 24, 
    paddingHorizontal: 40 
  },
});