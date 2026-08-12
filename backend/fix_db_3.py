import sqlite3

def add_new_task_tables():
    conn = sqlite3.connect('sql_app.db')
    c = conn.cursor()

    try:
        # Create ProjectTask table
        c.execute('''
            CREATE TABLE IF NOT EXISTS project_tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER,
                title VARCHAR,
                description VARCHAR,
                status VARCHAR DEFAULT 'todo',
                start_date VARCHAR,
                target_date VARCHAR,
                hard_deadline VARCHAR,
                estimated_hours INTEGER DEFAULT 0,
                priority VARCHAR DEFAULT 'medium',
                depends_on VARCHAR,
                weight INTEGER DEFAULT 1,
                FOREIGN KEY(project_id) REFERENCES meeting_events(id) ON DELETE CASCADE
            )
        ''')
        c.execute('CREATE INDEX IF NOT EXISTS ix_project_tasks_id ON project_tasks (id)')
        c.execute('CREATE INDEX IF NOT EXISTS ix_project_tasks_project_id ON project_tasks (project_id)')
        c.execute('CREATE INDEX IF NOT EXISTS ix_project_tasks_title ON project_tasks (title)')

        # Create TaskAssignment table
        c.execute('''
            CREATE TABLE IF NOT EXISTS task_assignments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id INTEGER,
                email VARCHAR,
                is_vip BOOLEAN DEFAULT 0,
                FOREIGN KEY(task_id) REFERENCES project_tasks(id) ON DELETE CASCADE
            )
        ''')
        c.execute('CREATE INDEX IF NOT EXISTS ix_task_assignments_id ON task_assignments (id)')
        c.execute('CREATE INDEX IF NOT EXISTS ix_task_assignments_task_id ON task_assignments (task_id)')
        c.execute('CREATE INDEX IF NOT EXISTS ix_task_assignments_email ON task_assignments (email)')
        
        conn.commit()
        print("Successfully created project_tasks and task_assignments tables.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    add_new_task_tables()
