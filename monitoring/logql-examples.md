# LogQL examples

Select the **Loki** data source in Grafana Explore and run these queries:

1. Nginx logs:

   ```logql
   {service="nginx"}
   ```

2. Node.js application logs:

   ```logql
   {service="app"}
   ```

3. MySQL logs containing an error (case-insensitive):

   ```logql
   {service="mysql"} |~ "(?i)error"
   ```
