#!/usr/bin/env python3
"""
API エンドポイントのデバッグスクリプト
"""

import sys
import traceback
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.models.change import Change
from app.models.problem import Problem


def test_changes_query():
    """Changes endpoint similar query"""
    try:
        print("Testing changes query...")
        for db in get_db():
            # Query mimicking the API endpoint
            query = db.query(Change)

            # Apply filters (similar to API)
            per_page = 20
            page = 1
            offset = (page - 1) * per_page

            changes = query.offset(offset).limit(per_page).all()
            total_count = query.count()

            print(
                f"✅ Changes query successful: {len(changes)} items, total: {total_count}"
            )
            return True

    except Exception as e:
        print(f"❌ Changes query failed: {e}")
        print(traceback.format_exc())
        return False


def test_problems_query():
    """Problems endpoint similar query"""
    try:
        print("Testing problems query...")
        for db in get_db():
            # Query mimicking the API endpoint
            query = db.query(Problem)

            # Apply filters (similar to API)
            per_page = 20
            page = 1
            offset = (page - 1) * per_page

            problems = query.offset(offset).limit(per_page).all()
            total_count = query.count()

            print(
                f"✅ Problems query successful: {len(problems)} items, total: {total_count}"
            )
            return True

    except Exception as e:
        print(f"❌ Problems query failed: {e}")
        print(traceback.format_exc())
        return False


def test_uuid_handling():
    """Test UUID type handling"""
    try:
        print("Testing UUID handling...")
        import uuid
        from app.models.common import UUID as CustomUUID

        test_uuid = uuid.uuid4()
        print(f"✅ UUID creation: {test_uuid}")
        print(f"✅ UUID type: {type(test_uuid)}")
        return True

    except Exception as e:
        print(f"❌ UUID handling failed: {e}")
        print(traceback.format_exc())
        return False


def main():
    """Main function"""
    print("🔧 Backend API Debug Script")
    print("=" * 50)

    results = {
        "uuid_handling": test_uuid_handling(),
        "changes_query": test_changes_query(),
        "problems_query": test_problems_query(),
    }

    print("\n📊 Results Summary:")
    print("-" * 30)
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{test_name}: {status}")

    all_passed = all(results.values())
    print(
        f"\n🎯 Overall: {'✅ ALL TESTS PASSED' if all_passed else '❌ SOME TESTS FAILED'}"
    )

    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
