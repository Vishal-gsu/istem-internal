import sqlite3

def alter_task_tables():
    conn = sqlite3.connect('sql_app.db')
    c = conn.cursor()

    try:
        c.execute("ALTER TABLE project_tasks ADD COLUMN assignor_email VARCHAR")
        conn.commit()
        print("Successfully added assignor_email to project_tasks.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("Column assignor_email already exists.")
        else:
            print(f"Error: {e}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    alter_task_tables()
