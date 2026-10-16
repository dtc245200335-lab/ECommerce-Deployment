# ECommerce-Deployment

Đồ án 09: website thương mại điện tử dùng Express.js, EJS, MySQL, Nginx và Docker Compose.

## Yêu cầu

- Docker Desktop với Docker Compose v2 đang chạy.
- Git để tải source về máy.

## Dựng dự án trên máy mới

Mở terminal tại thư mục repository và tạo file biến môi trường cục bộ:

```powershell
Copy-Item .env.example .env
```

Mở `.env`, thay từng giá trị `replace_with_...` bằng mật khẩu/secret ngẫu nhiên riêng. Không commit hoặc gửi file `.env`. Giữ `COMPOSE_PROJECT_NAME=ecommerce-deployment` nếu dùng cấu hình mặc định.

Kiểm tra cấu hình rồi khởi chạy:

```powershell
docker compose config --quiet
docker compose up -d --build
docker compose ps
```

Theo dõi khởi động nếu service chưa sẵn sàng:

```powershell
docker compose logs --tail 100 mysql app mysql-exporter grafana
```

## Truy cập dịch vụ

- Website: <http://localhost:8088>
- phpMyAdmin: <http://localhost:8082>
- Grafana: <http://localhost:3000> (user `admin`, mật khẩu là `GRAFANA_ADMIN_PASSWORD` trong `.env`)
- Prometheus: <http://localhost:9090>
- cAdvisor: <http://localhost:8081>

Các cổng được bind vào loopback `127.0.0.1`. MySQL và Loki không publish cổng ra máy host; các service liên quan truy cập chúng qua Docker network.

## Khởi tạo MySQL

Khi MySQL khởi tạo **data directory trống**, image chạy lần lượt:

1. `database/init/00-create-exporter-user.sh`: tạo user `exporter` bằng `MYSQL_EXPORTER_PASSWORD` và cấp `PROCESS`, `REPLICATION CLIENT`, `SELECT`. Giá trị này chỉ được chứa chữ, số, `_` hoặc `-`.
2. `database/schema.sql`: tạo các bảng.
3. `database/seed.sql`: thêm sản phẩm mẫu.

Các file này được mount vào `/docker-entrypoint-initdb.d` theo thứ tự tên file. MySQL chỉ chạy init scripts khi khởi tạo datadir lần đầu. Volume `mysql_data` đã tồn tại sẽ được giữ nguyên; thay đổi các file init không tự chạy lại trên database hiện tại.

Compose chờ healthcheck MySQL thành công trước khi khởi chạy app, phpMyAdmin và MySQL Exporter. Có thể tạo secret phù hợp bằng `openssl rand -hex 32`.

Compose lưu dữ liệu trong các named volume `mysql_data`, `grafana_data`, `prometheus_data`, `loki_data` và `promtail_positions`. Không xóa volume để xử lý lỗi khởi động. Dự án không yêu cầu `docker compose down -v`.

## Grafana và log

Datasource `E-Commerce Prometheus` và `E-Commerce Loki`, cùng dashboard `E-Commerce System Monitoring`, được cấu hình provisioning từ `monitoring/grafana-datasources.yml`, `monitoring/grafana-dashboards.yml` và `monitoring/dashboards/`.

Provisioning dùng UID và folder riêng để tránh cập nhật datasource/dashboard hiện có. Với Grafana volume cũ, cấu hình mới được thêm khi Grafana khởi động; không xóa volume hiện tại. Mở **Explore → E-Commerce Loki** để chạy các ví dụ trong [monitoring/logql-examples.md](monitoring/logql-examples.md).

## Kiểm tra nhanh

```powershell
docker compose config --quiet
docker compose ps
docker compose logs --tail 100
```

Trong Prometheus, kiểm tra `up`, `mysql_up`, `nginx_up`. Trong Grafana Explore, chạy các truy vấn LogQL mẫu. Truy vấn log MySQL có từ khóa `error` có thể trả rỗng nếu MySQL chưa ghi lỗi; hãy kiểm tra `{service="mysql"}` để xác nhận log đang được thu thập.

Nếu cần xác minh MySQL init scripts, hãy dùng một môi trường thử nghiệm riêng với volume mới. Không gỡ hoặc thay thế named volume của môi trường đang có dữ liệu.
