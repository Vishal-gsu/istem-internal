import sqlite3
import os

db_path = 'sql_app.db'
if not os.path.exists(db_path):
    print("sql_app.db not found here")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    columns_to_add = [
        ("project_roles", "status", "VARCHAR DEFAULT 'accepted'")
    ]

    for table, col_name, col_type in columns_to_add:
        try:
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}")
            print(f"Added column {col_name} to {table}")
        except sqlite3.OperationalError as e:
            print(f"Column {col_name} might already exist or error: {e}")

    conn.commit()
    conn.close()
