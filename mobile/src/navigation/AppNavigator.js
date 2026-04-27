import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';

import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { PatientsScreen } from '../screens/PatientsScreen';
import { DoctorsScreen } from '../screens/DoctorsScreen';
import { AppointmentsScreen } from '../screens/AppointmentsScreen';
import { PrescriptionsScreen } from '../screens/PrescriptionsScreen';
import { AIDiagnosisScreen } from '../screens/AIDiagnosisScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { AddPrescriptionScreen } from '../screens/AddPrescriptionScreen';

const AuthStack = createNativeStackNavigator();
const DoctorStack = createNativeStackNavigator();
const PatientTabs = createBottomTabNavigator();
const DoctorTabs = createBottomTabNavigator();
const AdminTabs = createBottomTabNavigator();

function DoctorTabNavigator() {
  return (
    <DoctorTabs.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <DoctorTabs.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Home' }} />
      <DoctorTabs.Screen name="Appointments" component={AppointmentsScreen} />
      <DoctorTabs.Screen name="Prescriptions" component={PrescriptionsScreen} />
      <DoctorTabs.Screen name="Profile" component={ProfileScreen} />
    </DoctorTabs.Navigator>
  );
}

function DoctorNavigator() {
  return (
    <DoctorStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
      }}
    >
      <DoctorStack.Screen name="DoctorTabs" component={DoctorTabNavigator} options={{ headerShown: false }} />
      <DoctorStack.Screen name="AddPrescription" component={AddPrescriptionScreen} options={{ title: 'New prescription' }} />
    </DoctorStack.Navigator>
  );
}

function PatientNavigator() {
  return (
    <PatientTabs.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <PatientTabs.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Home' }} />
      <PatientTabs.Screen name="Appointments" component={AppointmentsScreen} />
      <PatientTabs.Screen name="Prescriptions" component={PrescriptionsScreen} />
      <PatientTabs.Screen name="AI Diagnosis" component={AIDiagnosisScreen} />
      <PatientTabs.Screen name="Profile" component={ProfileScreen} />
    </PatientTabs.Navigator>
  );
}

function AdminNavigator() {
  return (
    <AdminTabs.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <AdminTabs.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Home' }} />
      <AdminTabs.Screen name="Patients" component={PatientsScreen} />
      <AdminTabs.Screen name="Doctors" component={DoctorsScreen} />
      <AdminTabs.Screen name="Appointments" component={AppointmentsScreen} />
      <AdminTabs.Screen name="Prescriptions" component={PrescriptionsScreen} />
    </AdminTabs.Navigator>
  );
}

function RoleNavigator() {
  const { user } = useAuth();
  if (user.role === 'patient') {
    return <PatientNavigator />;
  }
  if (user.role === 'doctor') {
    return <DoctorNavigator />;
  }
  return <AdminNavigator />;
}

export function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <>
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : (
        <AuthStack.Screen name="Main" component={RoleNavigator} />
      )}
    </AuthStack.Navigator>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
