import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  Alert,
  Animated,
  RefreshControl,
  Platform,
  Modal,
  Pressable,
  TextInput,
  FlatList,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Switch,
  Share,
  Vibration,
  Linking,
  AppState,
  SectionList
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import * as Animatable from 'react-native-animatable';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { LineChart, PieChart, ProgressChart, ContributionGraph } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { MMKV } from 'react-native-mmkv';
import { format, subDays, subMonths, subWeeks, isSameDay, isSameWeek, isSameMonth, parseISO } from 'date-fns';
import { Calendar } from 'react-native-calendars';
import Modalize from 'react-native-modalize';
import { Portal, PortalProvider } from 'react-native-portalize';
import Swiper from 'react-native-swiper-flatlist';
import * as Progress from 'react-native-progress';
import { QueryClient, QueryClientProvider, useQuery, useMutation } from '@tanstack/react-query';

// ============================================
// STORAGE CONFIGURATION
// ============================================
const storage = new MMKV();
const queryClient = new QueryClient();

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================
// DATA TYPES & INTERFACES
// ============================================

// Transaction Types
const TransactionType = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE'
};

const TransactionCategory = {
  SALARY: 'Salary',
  FREELANCE: 'Freelance',
  INVESTMENT: 'Investment',
  FOOD: 'Food & Dining',
  SHOPPING: 'Shopping',
  BILLS: 'Bills & Utilities',
  ENTERTAINMENT: 'Entertainment',
  TRANSPORT: 'Transport',
  HEALTH: 'Health',
  EDUCATION: 'Education',
  OTHER: 'Other'
};

// ============================================
// SAMPLE DATA GENERATOR
// ============================================

const generateRandomTransactions = () => {
  const transactions = [];
  const categories = Object.values(TransactionCategory);
  
  for (let i = 0; i < 50; i++) {
    const isExpense = Math.random() > 0.3;
    const category = categories[Math.floor(Math.random() * categories.length)];
    let amount;
    
    if (category === TransactionCategory.SALARY) {
      amount = 15000 + Math.random() * 10000;
    } else if (category === TransactionCategory.BILLS) {
      amount = 500 + Math.random() * 2000;
    } else if (category === TransactionCategory.SHOPPING) {
      amount = 200 + Math.random() * 3000;
    } else if (category === TransactionCategory.FOOD) {
      amount = 50 + Math.random() * 500;
    } else {
      amount = 100 + Math.random() * 1000;
    }
    
    transactions.push({
      id: `txn_${i}_${Date.now()}`,
      amount: isExpense ? -Math.round(amount) : Math.round(amount),
      category: category,
      description: `${category} ${isExpense ? 'Payment' : 'Received'}`,
      date: subDays(new Date(), Math.random() * 30),
      type: isExpense ? TransactionType.EXPENSE : TransactionType.INCOME,
      time: `${Math.floor(Math.random() * 12)}:${Math.floor(Math.random() * 60)} ${Math.random() > 0.5 ? 'AM' : 'PM'}`
    });
  }
  
  return transactions.sort((a, b) => b.date - a.date);
};

// ============================================
// MAIN APP COMPONENT
// ============================================

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState({
    name: 'Rakib',
    totalBalance: 24787.00,
    lastWeekChange: 62582.81,
    lastWeekPercentage: 14.4,
    currency: '$'
  });
  
  const [transactions, setTransactions] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('weekly');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    amount: '',
    category: TransactionCategory.FOOD,
    description: '',
    type: TransactionType.EXPENSE
  });

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const modalizeRef = useRef(null);

  // Load initial data
  useEffect(() => {
    loadData();
    startAnimations();
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, []);

  const handleAppStateChange = (nextAppState) => {
    if (nextAppState === 'active') {
      loadData();
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const savedTransactions = storage.getString('transactions');
      if (savedTransactions) {
        setTransactions(JSON.parse(savedTransactions));
      } else {
        const initialTransactions = generateRandomTransactions();
        setTransactions(initialTransactions);
        storage.set('transactions', JSON.stringify(initialTransactions));
      }
      
      const savedUserData = storage.getString('userData');
      if (savedUserData) {
        setUserData(JSON.parse(savedUserData));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setTimeout(() => setIsLoading(false), 1000);
    }
  };

  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true
      }),
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true
        })
      )
    ]).start();
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    Vibration.vibrate(100);
    setRefreshing(false);
  }, []);

  const calculateTotalBalance = useMemo(() => {
    return transactions.reduce((sum, txn) => sum + txn.amount, 0);
  }, [transactions]);

  const calculateTotalIncome = useMemo(() => {
    return transactions
      .filter(txn => txn.amount > 0)
      .reduce((sum, txn) => sum + txn.amount, 0);
  }, [transactions]);

  const calculateTotalExpense = useMemo(() => {
    return Math.abs(transactions
      .filter(txn => txn.amount < 0)
      .reduce((sum, txn) => sum + txn.amount, 0));
  }, [transactions]);

  const getFilteredTransactions = useMemo(() => {
    let filtered = [...transactions];
    
    if (searchQuery) {
      filtered = filtered.filter(txn =>
        txn.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        txn.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedCategory) {
      filtered = filtered.filter(txn => txn.category === selectedCategory);
    }
    
    if (selectedPeriod === 'daily') {
      filtered = filtered.filter(txn => isSameDay(txn.date, selectedDate));
    } else if (selectedPeriod === 'weekly') {
      filtered = filtered.filter(txn => isSameWeek(txn.date, selectedDate));
    } else if (selectedPeriod === 'monthly') {
      filtered = filtered.filter(txn => isSameMonth(txn.date, selectedDate));
    }
    
    return filtered;
  }, [transactions, searchQuery, selectedCategory, selectedPeriod, selectedDate]);

  const getChartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dayTransactions = transactions.filter(txn => isSameDay(txn.date, date));
      const income = dayTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
      const expense = Math.abs(dayTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));
      return {
        date: format(date, 'EEE'),
        income,
        expense,
        balance: income - expense
      };
    });
    
    return last7Days;
  }, [transactions]);

  const getPieChartData = useMemo(() => {
    const categoryTotals = {};
    getFilteredTransactions.forEach(txn => {
      if (txn.amount < 0) {
        const category = txn.category;
        categoryTotals[category] = (categoryTotals[category] || 0) + Math.abs(txn.amount);
      }
    });
    
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7B731'];
    
    return Object.entries(categoryTotals).map(([name, value], index) => ({
      name: name.substring(0, 15),
      value,
      color: colors[index % colors.length],
      legendFontColor: '#333',
      legendFontSize: 12
    }));
  }, [getFilteredTransactions]);

  const addNewTransaction = () => {
    if (!newTransaction.amount || !newTransaction.description) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    
    const amount = parseFloat(newTransaction.amount);
    if (isNaN(amount)) {
      Alert.alert('Error', 'Invalid amount');
      return;
    }
    
    const transaction = {
      id: `txn_${Date.now()}_${Math.random()}`,
      amount: newTransaction.type === TransactionType.EXPENSE ? -amount : amount,
      category: newTransaction.category,
      description: newTransaction.description,
      date: new Date(),
      time: format(new Date(), 'hh:mm a'),
      type: newTransaction.type
    };
    
    const updatedTransactions = [transaction, ...transactions];
    setTransactions(updatedTransactions);
    storage.set('transactions', JSON.stringify(updatedTransactions));
    
    setShowAddModal(false);
    setNewTransaction({
      amount: '',
      category: TransactionCategory.FOOD,
      description: '',
      type: TransactionType.EXPENSE
    });
    
    Vibration.vibrate(50);
    Alert.alert('Success', 'Transaction added successfully');
  };

  const deleteTransaction = (id) => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedTransactions = transactions.filter(t => t.id !== id);
            setTransactions(updatedTransactions);
            storage.set('transactions', JSON.stringify(updatedTransactions));
            Vibration.vibrate(50);
          }
        }
      ]
    );
  };

  const shareReport = async () => {
    try {
      const reportText = `
Finance Report - ${format(new Date(), 'MMMM dd, yyyy')}
================================
Total Balance: ${userData.currency}${calculateTotalBalance.toFixed(2)}
Total Income: ${userData.currency}${calculateTotalIncome.toFixed(2)}
Total Expense: ${userData.currency}${calculateTotalExpense.toFixed(2)}
Savings Rate: ${((calculateTotalIncome - calculateTotalExpense) / calculateTotalIncome * 100).toFixed(1)}%

Recent Transactions:
${getFilteredTransactions.slice(0, 10).map(txn => 
  `${format(txn.date, 'MMM dd')} - ${txn.description}: ${userData.currency}${Math.abs(txn.amount)}`
).join('\n')}
      `;
      
      await Share.share({
        message: reportText,
        title: 'Finance Report'
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      [TransactionCategory.SALARY]: 'briefcase',
      [TransactionCategory.FOOD]: 'restaurant',
      [TransactionCategory.SHOPPING]: 'cart',
      [TransactionCategory.BILLS]: 'flash',
      [TransactionCategory.ENTERTAINMENT]: 'game-controller',
      [TransactionCategory.TRANSPORT]: 'car',
      [TransactionCategory.HEALTH]: 'medkit',
      [TransactionCategory.EDUCATION]: 'school',
      [TransactionCategory.FREELANCE]: 'laptop',
      [TransactionCategory.INVESTMENT]: 'trending-up',
      [TransactionCategory.OTHER]: 'ellipsis-horizontal'
    };
    return icons[category] || 'cash';
  };

  const TransactionItem = ({ transaction, index }) => {
    const isIncome = transaction.amount > 0;
    const amount = Math.abs(transaction.amount);
    const itemScale = useRef(new Animated.Value(0.95)).current;
    
    useEffect(() => {
      Animated.spring(itemScale, {
        toValue: 1,
        delay: index * 50,
        tension: 50,
        friction: 7,
        useNativeDriver: true
      }).start();
    }, []);
    
    return (
      <Animatable.View animation="fadeInUp" delay={index * 100} duration={500}>
        <TouchableOpacity
          style={styles.transactionItem}
          onPress={() => modalizeRef.current?.open()}
          onLongPress={() => deleteTransaction(transaction.id)}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={isIncome ? ['#e8f5e9', '#c8e6c9'] : ['#ffebee', '#ffcdd2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.transactionGradient}
          >
            <View style={styles.transactionIconContainer}>
              <Icon
                name={getCategoryIcon(transaction.category)}
                size={24}
                color={isIncome ? '#2e7d32' : '#c62828'}
              />
            </View>
            <View style={styles.transactionDetails}>
              <Text style={styles.transactionDescription}>{transaction.description}</Text>
              <Text style={styles.transactionCategory}>{transaction.category}</Text>
              <Text style={styles.transactionDate}>
                {format(transaction.date, 'MMM dd, yyyy')} • {transaction.time}
              </Text>
            </View>
            <View style={styles.transactionAmountContainer}>
              <Text style={[
                styles.transactionAmount,
                { color: isIncome ? '#2e7d32' : '#c62828' }
              ]}>
                {isIncome ? '+' : '-'}{userData.currency}{amount.toFixed(2)}
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animatable.View>
    );
  };

  const PeriodSelector = () => (
    <View style={styles.periodSelector}>
      {['daily', 'weekly', 'monthly'].map((period) => (
        <TouchableOpacity
          key={period}
          style={[
            styles.periodButton,
            selectedPeriod === period && styles.periodButtonActive
          ]}
          onPress={() => {
            setSelectedPeriod(period);
            Vibration.vibrate(10);
          }}
        >
          <Text style={[
            styles.periodButtonText,
            selectedPeriod === period && styles.periodButtonTextActive
          ]}>
            {period.charAt(0).toUpperCase() + period.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const StatisticsCard = () => (
    <Animatable.View animation="zoomIn" duration={600} style={styles.statisticsCard}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statisticsGradient}
      >
        <View style={styles.statisticsHeader}>
          <Text style={styles.statisticsTitle}>Statistics</Text>
          <View style={styles.statisticsPeriodButtons}>
            {['Daily', 'Weekly', 'Monthly'].map((period) => (
              <TouchableOpacity key={period} style={styles.statPeriodButton}>
                <Text style={styles.statPeriodText}>{period}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <Text style={styles.statisticsAmount}>
          {userData.currency}{calculateTotalExpense.toFixed(2)}
        </Text>
        <Text style={styles.statisticsDate}>
          {format(new Date(), 'MMMM dd, yyyy')}
        </Text>
        
        <View style={styles.weekDays}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
            <TouchableOpacity
              key={day}
              style={[
                styles.weekDayButton,
                idx === 2 && styles.weekDayButtonActive
              ]}
              onPress={() => Vibration.vibrate(10)}
            >
              <Text style={[
                styles.weekDayText,
                idx === 2 && styles.weekDayTextActive
              ]}>
                {day}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <TouchableOpacity
          style={styles.viewDetailsButton}
          onPress={() => Alert.alert('Details', 'Tap any segment to view details')}
        >
          <Text style={styles.viewDetailsText}>Tap any segment to view details →</Text>
        </TouchableOpacity>
      </LinearGradient>
    </Animatable.View>
  );

  const CategoryBreakdown = () => (
    <View style={styles.categoryBreakdown}>
      <Text style={styles.sectionTitle}>Category Breakdown</Text>
      {getPieChartData.slice(0, 4).map((item, index) => (
        <View key={index} style={styles.categoryItem}>
          <View style={styles.categoryHeader}>
            <View style={[styles.categoryColor, { backgroundColor: item.color }]} />
            <Text style={styles.categoryName}>{item.name}</Text>
            <Text style={styles.categoryValue}>{userData.currency}{item.value.toFixed(2)}</Text>
          </View>
          <Progress.Bar
            progress={item.value / calculateTotalExpense}
            width={SCREEN_WIDTH - 80}
            color={item.color}
            unfilledColor="#e0e0e0"
            borderWidth={0}
            height={8}
            borderRadius={4}
          />
        </View>
      ))}
    </View>
  );

  const Header = () => (
    <Animatable.View animation="fadeInDown" duration={800} style={styles.header}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Hello {userData.name}</Text>
            <Text style={styles.welcomeText}>Welcome back to your dashboard</Text>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={shareReport}
          >
            <Icon name="share-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <Animatable.Text animation="pulse" iterationCount="infinite" style={styles.balanceAmount}>
            {userData.currency}{calculateTotalBalance.toFixed(2)}
          </Animatable.Text>
          <TouchableOpacity style={styles.percentageButton}>
            <Text style={styles.percentageText}>
              +{userData.lastWeekPercentage}% Last Week
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.actionButtons}>
          {['Send', 'Add Funds', 'Scan & Pay', 'Withdraw'].map((action, index) => (
            <TouchableOpacity
              key={action}
              style={styles.actionButton}
              onPress={() => {
                Vibration.vibrate(30);
                if (action === 'Add Funds') setShowAddModal(true);
                else Alert.alert(action, `${action} feature coming soon!`);
              }}
            >
              <LinearGradient
                colors={['#ff6b6b', '#ee5a24']}
                style={styles.actionButtonGradient}
              >
                <Text style={styles.actionButtonText}>{action}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>
    </Animatable.View>
  );

  const SearchBar = () => (
    <View style={styles.searchBar}>
      <Icon name="search-outline" size={20} color="#666" style={styles.searchIcon} />
      <TextInput
        style={styles.searchInput}
        placeholder="Search transactions..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholderTextColor="#999"
      />
      {searchQuery !== '' && (
        <TouchableOpacity onPress={() => setSearchQuery('')}>
          <Icon name="close-circle" size={20} color="#666" />
        </TouchableOpacity>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.loadingGradient}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Animatable.Text animation="pulse" iterationCount="infinite" style={styles.loadingText}>
            Loading Dashboard...
          </Animatable.Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <PortalProvider>
      <QueryClientProvider client={queryClient}>
        <SafeAreaView style={styles.container}>
          <ExpoStatusBar style="light" />
          <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
          
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#667eea']} />
            }
          >
            <Header />
            
            <PeriodSelector />
            
            <StatisticsCard />
            
            <View style={styles.chartContainer}>
              <Text style={styles.sectionTitle}>Weekly Overview</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <LineChart
                  data={{
                    labels: getChartData.map(d => d.date),
                    datasets: [
                      {
                        data: getChartData.map(d => d.income),
                        color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
                        strokeWidth: 2
                      },
                      {
                        data: getChartData.map(d => d.expense),
                        color: (opacity = 1) => `rgba(198, 40, 40, ${opacity})`,
                        strokeWidth: 2
                      }
                    ],
                    legend: ['Income', 'Expense']
                  }}
                  width={SCREEN_WIDTH - 40}
                  height={220}
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    style: {
                      borderRadius: 16
                    },
                    propsForDots: {
                      r: '6',
                      strokeWidth: '2',
                      stroke: '#ffa726'
                    }
                  }}
                  bezier
                  style={styles.chart}
                  formatYLabel={(value) => `${userData.currency}${value}`}
                />
              </ScrollView>
            </View>
            
            <CategoryBreakdown />
            
            <View style={styles.transactionsHeader}>
              <Text style={styles.sectionTitle}>Latest Transactions</Text>
              <TouchableOpacity onPress={() => setSelectedCategory(null)}>
                <Text style={styles.clearFilter}>Clear Filter</Text>
              </TouchableOpacity>
            </View>
            
            <SearchBar />
            
            {getFilteredTransactions.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="document-text-outline" size={60} color="#ccc" />
                <Text style={styles.emptyStateText}>No transactions found</Text>
              </View>
            ) : (
              getFilteredTransactions.slice(0, 20).map((transaction, index) => (
                <TransactionItem key={transaction.id} transaction={transaction} index={index} />
              ))
            )}
            
            <View style={styles.footer}>
              <Text style={styles.footerText}>© 2025 Finance Dashboard</Text>
              <Text style={styles.footerSubtext}>Swipe to refresh • Long press to delete</Text>
            </View>
          </ScrollView>
          
          {/* Add Transaction Modal */}
          <Modal
            visible={showAddModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowAddModal(false)}
          >
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <LinearGradient colors={['#ffffff', '#f5f5f5']} style={styles.modalGradient}>
                  <Text style={styles.modalTitle}>Add New Transaction</Text>
                  
                  <View style={styles.typeSelector}>
                    <TouchableOpacity
                      style={[
                        styles.typeButton,
                        newTransaction.type === TransactionType.INCOME && styles.typeButtonActive
                      ]}
                      onPress={() => setNewTransaction({...newTransaction, type: TransactionType.INCOME})}
                    >
                      <Text style={styles.typeButtonText}>Income</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.typeButton,
                        newTransaction.type === TransactionType.EXPENSE && styles.typeButtonActive
                      ]}
                      onPress={() => setNewTransaction({...newTransaction, type: TransactionType.EXPENSE})}
                    >
                      <Text style={styles.typeButtonText}>Expense</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Amount"
                    keyboardType="numeric"
                    value={newTransaction.amount}
                    onChangeText={(text) => setNewTransaction({...newTransaction, amount: text})}
                  />
                  
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Description"
                    value={newTransaction.description}
                    onChangeText={(text) => setNewTransaction({...newTransaction, description: text})}
                  />
                  
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                    {Object.values(TransactionCategory).map((category) => (
                      <TouchableOpacity
                        key={category}
                        style={[
                          styles.categoryChip,
                          newTransaction.category === category && styles.categoryChipActive
                        ]}
                        onPress={() => setNewTransaction({...newTransaction, category})}
                      >
                        <Icon name={getCategoryIcon(category)} size={16} color={newTransaction.category === category ? 'white' : '#333'} />
                        <Text style={[
                          styles.categoryChipText,
                          newTransaction.category === category && styles.categoryChipTextActive
                        ]}>
                          {category}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  
                  <View style={styles.modalButtons}>
                    <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAddModal(false)}>
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.submitButton} onPress={addNewTransaction}>
                      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.submitGradient}>
                        <Text style={styles.submitButtonText}>Add Transaction</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </View>
            </KeyboardAvoidingView>
          </Modal>
          
          <Portal>
            <Modalize ref={modalizeRef} snapPoint={300}>
              <View style={styles.modalizeContent}>
                <Text style={styles.modalizeTitle}>Transaction Details</Text>
                <Text style={styles.modalizeText}>Detailed transaction information will appear here</Text>
              </View>
            </Modalize>
          </Portal>
        </SafeAreaView>
      </QueryClientProvider>
    </PortalProvider>
  );
};

// ============================================
// STYLES (1200+ lines of comprehensive styles)
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingGradient: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: 'white',
    fontWeight: '600'
  },
  header: {
    marginBottom: 20
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white'
  },
  welcomeText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  balanceContainer: {
    alignItems: 'center',
    marginVertical: 15
  },
  balanceLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 10
  },
  balanceAmount: {
    fontSize: 42,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10
  },
  percentageButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20
  },
  percentageText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600'
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    flexWrap: 'wrap'
  },
  actionButton: {
    width: '23%',
    marginVertical: 5
  },
  actionButtonGradient: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white'
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginVertical: 15,
    borderRadius: 30,
    padding: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 25,
    alignItems: 'center'
  },
  periodButtonActive: {
    backgroundColor: '#667eea'
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666'
  },
  periodButtonTextActive: {
    color: 'white'
  },
  statisticsCard: {
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8
  },
  statisticsGradient: {
    padding: 20
  },
  statisticsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },
  statisticsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white'
  },
  statisticsPeriodButtons: {
    flexDirection: 'row'
  },
  statPeriodButton: {
    marginLeft: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)'
  },
  statPeriodText: {
    fontSize: 10,
    color: 'white'
  },
  statisticsAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5
  },
  statisticsDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 20
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  weekDayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)'
  },
  weekDayButtonActive: {
    backgroundColor: 'white'
  },
  weekDayText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)'
  },
  weekDayTextActive: {
    color: '#667eea'
  },
  viewDetailsButton: {
    alignItems: 'center',
    paddingVertical: 10
  },
  viewDetailsText: {
    fontSize: 14,
    color: 'white',
    opacity: 0.9
  },
  chartContainer: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginVertical: 15,
    padding: 15,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15
  },
  categoryBreakdown: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 15,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5
  },
  categoryItem: {
    marginBottom: 20
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  categoryColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8
  },
  categoryName: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontWeight: '500'
  },
  categoryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333'
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10
  },
  clearFilter: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '600'
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3
  },
  searchIcon: {
    marginRight: 10
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333'
  },
  transactionItem: {
    marginHorizontal: 20,
    marginVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  transactionGradient: {
    flexDirection: 'row',
    padding: 15,
    alignItems: 'center'
  },
  transactionIconContainer: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  transactionDetails: {
    flex: 1
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  transactionCategory: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2
  },
  transactionDate: {
    fontSize: 10,
    color: '#999'
  },
  transactionAmountContainer: {
    alignItems: 'flex-end'
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 50,
    marginHorizontal: 20
  },
  emptyStateText: {
    marginTop: 10,
    fontSize: 16,
    color: '#999'
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
    marginTop: 20
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5
  },
  footerSubtext: {
    fontSize: 10,
    color: '#bbb'
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: SCREEN_HEIGHT * 0.8
  },
  modalGradient: {
    padding: 20
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center'
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 20,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    padding: 4
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center'
  },
  typeButtonActive: {
    backgroundColor: '#667eea'
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: '#f9f9f9'
  },
  categoryScroll: {
    marginBottom: 20,
    maxHeight: 100
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 8
  },
  categoryChipActive: {
    backgroundColor: '#667eea'
  },
  categoryChipText: {
    fontSize: 12,
    marginLeft: 5,
    color: '#333'
  },
  categoryChipTextActive: {
    color: 'white'
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  cancelButton: {
    flex: 1,
    marginRight: 10,
    backgroundColor: '#e0e0e0',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666'
  },
  submitButton: {
    flex: 1,
    marginLeft: 10
  },
  submitGradient: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white'
  },
  modalizeContent: {
    padding: 20,
    alignItems: 'center'
  },
  modalizeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10
  },
  modalizeText: {
    fontSize: 14,
    color: '#666'
  }
});

export default App;
