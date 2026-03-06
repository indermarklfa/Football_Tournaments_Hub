from passlib.context import CryptContext
import psycopg2

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
hashed = pwd_context.hash('newpassword123')

conn = psycopg2.connect(host='localhost', port=5433, dbname='tournaments', user='postgres', password='postgres')
cur = conn.cursor()
cur.execute("UPDATE users SET password_hash = %s WHERE email = %s", (hashed, 'bashimane007@gmail.com'))
conn.commit()
cur.close()
conn.close()
print('Password updated successfully')