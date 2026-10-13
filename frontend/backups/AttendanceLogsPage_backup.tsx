import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Calendar,
  Eye,
  Building2,
  User,
  Camera as CameraIcon,
  Download,
  Clock,
  CheckCircle2,
  LogOut,
  LogIn,
  X,
  Sparkles,
  Filter,
  RefreshCw
} from 'lucide-react';
import { AuthResponse } from '../services/api';

const API = '/api/v1';

interface Props {
  authData: AuthResponse;
}

interface Company {
  id: string;
  name: string;
  total_employees?: number;
}

interface AttendanceLog {
  id: string;
  photo_url?: string;
  name: string;
  emp_id: string;
  timestamp: string;
  camera_type: 'entry' | 'exit' | string;
  camera_id?: string;
  confidence?: number;
  company_name?: string;
  tenant_id?: string;
}

// Default fallback mock data matching screenshot for instant high-fidelity demonstration
const DEFAULT_MOCK_LOGS: AttendanceLog[] = [
  {
    id: 'log-101',
    name: 'Pavitarta Chadha',
    emp_id: '3940',
    timestamp: '2026-09-14T17:25:46',
    camera_type: 'exit',
    camera_id: 'CAM-01',
    confidence: 0.985,
    photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'log-102',
    name: 'Ramanjeet Singh',
    emp_id: '2549',
    timestamp: '2026-09-14T16:33:20',
    camera_type: 'exit',
    camera_id: 'CAM-02',
    confidence: 0.972,
    photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'log-103',
    name: 'Rajeev Kumar',
    emp_id: '3893',
    timestamp: '2026-09-14T16:00:30',
    camera_type: 'entry',
    camera_id: 'CAM-01',
    confidence: 0.991,
    photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'log-104',
    name: 'Ganesh Verma',
    emp_id: '2572',
    timestamp: '2026-09-14T14:52:14',
    camera_type: 'entry',
    camera_id: 'CAM-03',
    confidence: 0.968,
    photo_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'log-105',
    name: 'Abhishek Vasudev',
    emp_id: '1940',
    timestamp: '2026-09-14T14:23:37',
    camera_type: 'entry',
    camera_id: 'CAM-01',
    confidence: 0.989,
    photo_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80'
  }