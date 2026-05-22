#!/usr/bin/env python
"""
Debug script to test location extraction and cost filtering
"""
import sys
sys.path.insert(0, '.')
from app import find_area_from_query, df_global

# Test location extraction
test_queries = [
    "cost of fever in faridabad",
    "fever cost across faridabad",
    "fever faridabad",
    "faridabad fever cost",
    "cost fever faridabad",
]

print("=" * 80)
print("DEBUGGING LOCATION EXTRACTION")
print("=" * 80)

print(f"\n📊 Database Info:")
print(f"Total hospitals: {len(df_global)}")
print(f"Unique areas: {sorted(df_global['Area'].unique())}")
print(f"Faridabad hospitals: {len(df_global[df_global['Area'] == 'Faridabad'])}")

print(f"\n🔍 Testing find_area_from_query():")
for query in test_queries:
    result = find_area_from_query(query.lower())
    print(f"  '{query}' → {result}")

print(f"\n✅ All tests complete")
