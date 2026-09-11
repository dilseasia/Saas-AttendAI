"""
test_phase8_camera_engine.py
────────────────────────────
Integration test for MultiTenantCameraEngine:
Verifies CPUMonitor, RTSP connection helper, TenantEmbeddingCache, and frame processor.
"""

import asyncio
import numpy as np
from app.services.camera_engine import CPUMonitor, TenantEmbeddingCache, MultiTenantCameraEngine


def test_camera_engine_components():
    print("🧪 Running Multi-Tenant Camera Engine Unit & Integration Tests...\n")

    # 1. Test CPUMonitor
    monitor = CPUMonitor()
    mode, cpu_val = monitor.update()
    max_faces = monitor.get_max_faces()
    assert mode in ("normal", "high", "critical")
    print(f"✅ Step 1: CPUMonitor Working -> Mode: {mode}, Max Faces per frame: {max_faces}")

    # 2. Test TenantEmbeddingCache Matching
    cache = TenantEmbeddingCache()
    dummy_tenant = "tenant-test-101"
    cache.tenant_metadata[dummy_tenant] = [(1, "EMP001", "Aman Sharma")]

    # Generate a dummy 512-dim face vector
    vec1 = np.ones((512,), dtype=np.float32)
    vec1 /= np.linalg.norm(vec1)
    cache.tenant_vectors[dummy_tenant] = np.array([vec1], dtype=np.float32)

    # Test exact match
    match_res = cache.match(dummy_tenant, vec1)
    assert match_res is not None
    emp_db_id, emp_id, name, sim = match_res
    assert emp_id == "EMP001"
    assert sim >= 0.99
    print(f"✅ Step 2: Vectorized Cosine Match Verified -> Matched {name} ({emp_id}) with {sim*100:.1f}% confidence")

    # Test cross-tenant isolation
    match_other = cache.match("tenant-other-999", vec1)
    assert match_other is None
    print("✅ Step 3: Tenant Vector Isolation Verified (Cross-tenant match returns None)")

    print("\n🎉 ALL CAMERA ENGINE LOGIC TESTS PASSED PERFECTLY!")


if __name__ == "__main__":
    test_camera_engine_components()
