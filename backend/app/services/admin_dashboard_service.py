
from datetime import date

import asyncpg


class AdminDashboardService:
    """Company Admin dashboard queries, scoped by tenant_id."""

    @staticmethod
    async def get_stats(
        db: asyncpg.Connection,
        tenant_id,
        target_date: date,
    ) -> dict:
        """Return the four dashboard summary cards."""

        total_employees = await db.fetchval(
            """
            SELECT COUNT(*)
            FROM employees
            WHERE tenant_id = $1
              AND is_active = TRUE
            """,
            tenant_id,
        )

        entry_logs = await db.fetchval(
            """
            SELECT COUNT(*)
            FROM attendance_logs
            WHERE tenant_id = $1
              AND date = $2
              AND LOWER(event_type) = 'entry'
            """,
            tenant_id,
            target_date,
        )

        exit_logs = await db.fetchval(
            """
            SELECT COUNT(*)
            FROM attendance_logs
            WHERE tenant_id = $1
              AND date = $2
              AND LOWER(event_type) = 'exit'
            """,
            tenant_id,
            target_date,
        )

        present_today = await db.fetchval(
            """
            SELECT COUNT(DISTINCT emp_id)
            FROM attendance_logs
            WHERE tenant_id = $1
              AND date = $2
              AND LOWER(event_type) = 'entry'
            """,
            tenant_id,
            target_date,
        )

        total_employees = int(total_employees or 0)
        present_today = int(present_today or 0)

        return {
            "success": True,
            "date": target_date.isoformat(),
            "present_today": present_today,
            "total_employees": total_employees,
            "entry_logs": int(entry_logs or 0),
            "exit_logs": int(exit_logs or 0),
        }

    @staticmethod
    async def get_monthly_attendance(
        db: asyncpg.Connection,
        tenant_id,
        year: int,
        month: int,
    ) -> dict:
        """Return daily unique employee attendance counts."""

        rows = await db.fetch(
            """
            SELECT
                date,
                COUNT(DISTINCT emp_id) AS present_count
            FROM attendance_logs
            WHERE tenant_id = $1
              AND date >= make_date($2, $3, 1)
              AND date < (
                  make_date($2, $3, 1) + INTERVAL '1 month'
              )
              AND LOWER(event_type) = 'entry'
            GROUP BY date
            ORDER BY date
            """,
            tenant_id,
            year,
            month,
        )

        return {
            "success": True,
            "year": year,
            "month": month,
            "data": [
                {
                    "date": row["date"].isoformat(),
                    "present_count": int(row["present_count"]),
                }
                for row in rows
            ],
        }

    @staticmethod
    async def get_activity_hours(
        db: asyncpg.Connection,
        tenant_id,
        target_date: date,
    ) -> dict:
        """Count entry and exit events for each hour."""

        rows = await db.fetch(
            """
            SELECT
                EXTRACT(HOUR FROM time)::int AS hour,
                COUNT(*) FILTER (
                    WHERE LOWER(event_type) = 'entry'
                ) AS entry_count,
                COUNT(*) FILTER (
                    WHERE LOWER(event_type) = 'exit'
                ) AS exit_count
            FROM attendance_logs
            WHERE tenant_id = $1
              AND date = $2
            GROUP BY EXTRACT(HOUR FROM time)
            ORDER BY hour
            """,
            tenant_id,
            target_date,
        )

        return {
            "success": True,
            "date": target_date.isoformat(),
            "data": [
                {
                    "hour": int(row["hour"]),
                    "entry_count": int(row["entry_count"]),
                    "exit_count": int(row["exit_count"]),
                }
                for row in rows
            ],
        }
