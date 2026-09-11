"""
run_all_tests.py
────────────────
Executes the full Multi-Tenant SaaS Integration Test Suite (Phases 1 through 8) in subprocesses.
"""

import subprocess
import sys
import time

TEST_SCRIPTS = [
    ("Phase 1 & 2: Database Schema, Multi-Tenancy & Auth JWT", "test_phase1_phase2.py"),
    ("Phase 3: Company Setup (Employees, Cameras, Holidays)", "test_phase3_company.py"),
    ("Phase 4: Face Recognition Engine & Tenant BYTEA Storage", "test_phase4_face.py"),
    ("Phase 5: Real-Time Attendance Engine & Daily Reports", "test_phase5_attendance.py"),
    ("Phase 6: Leaves Management & Attendance Requests", "test_phase6_leaves.py"),
    ("Phase 7: Billing, Plan Limits & SuperAdmin Analytics", "test_phase7_billing.py"),
    ("Phase 8: RTSP Streaming, System Health, Backups & E2E Suite", "test_phase8_system.py"),
]


def main():
    print("=================================================================")
    print(" 🚀 SAAS ATTEND-AI: FULL PLATFORM INTEGRATION TEST SUITE (P1-P8)")
    print("=================================================================\n")

    start_time = time.time()
    passed_count = 0

    for name, script in TEST_SCRIPTS:
        print(f"\n▶ Running {name} ({script})...")
        res = subprocess.run([sys.executable, script], capture_output=False)
        if res.returncode == 0:
            passed_count += 1
        else:
            print(f"\n❌ {name} failed with exit code {res.returncode}")
            sys.exit(res.returncode)

    elapsed = round(time.time() - start_time, 2)
    print("\n=================================================================")
    print(f" 🎉 SUCCESS! ALL {passed_count}/{len(TEST_SCRIPTS)} TEST PHASES PASSED IN {elapsed}s!")
    print("=================================================================")


if __name__ == "__main__":
    main()
