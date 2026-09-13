---
description: 尚硅谷大模型技术之MySQL · 第7章 select子句。
---

# 第7章 select子句

## 7.1 select各个子句顺序

```sql
SELECT    DISTINCT 结果字段列表  
FROM    A表 inner 或 left 或 right JOIN B表    ON    A表.关联字段 = B表的关联字段 
WHERE    原始数据筛选条件 
GROUP BY 分组字段列表 【WITH ROLLUP】
HAVING    统计结果再次筛选条件 
ORDER BY 排序字段列表 
LIMIT    m,n;
```

（1）select

（2）from：从哪些表中筛选

（3）inner|left|right ...  on：关联多表查询时，去除笛卡尔积

（4）where：从表中筛选的条件

（5）group by：分组依据

（6）having：在分组统计结果中再次筛选（with rollup)

（7）order by：排序

（8）limit：分页

必须按照（1）-（8）的顺序编写子句。上述代码的逻辑执行步骤：

（1）FROM：对 FROM 子句中的左表 `<left_table> `和右表 `<right_table> `执行笛卡儿积，产生虚拟表 VT1；

（2）ON：对虚拟表 VT1 进行 ON 筛选，只有那些符合 `<join_condition> `的行才被插入虚拟表 VT2；

（3）JOIN

- 如果指定了联接类型为 OUTER JOIN（如 LEFT OUTER JOIN、RIGHT OUTER JOIN，OUTER可以省略），那么保留表中未匹配的行作为外部行添加到虚拟表 VT2，产生虚拟表VT3；
- 如果 FROM 子句包含两个以上的表，则对上一个连接生成的结果表 VT3 和下一个表重复执行步骤 1 ~ 步骤 3，直到处理完所有的表；

（4）WHERE：对虚拟表 VT3 应用WHERE过滤条件，只有符合 `<where_condition> `的记录才会被插入虚拟表 VT4；

（5）GROUP BY：根据 GROUP BY 子句中的列，对 VT4 中的记录进行分组`计算聚合函数`，产生 VT5； 

（6）WITH ROLLUP（汇总）：对 VT5 进行  ROLLUP 操作，产生表 VT6；

（7）HAVING：对虚拟表 VT6 应用 HAVING 过滤器，只有符合 `<having_condition> `的记录才会被插入到 VT7；

（8）SELECT：执行 SELECT 操作，选择指定的列，插入到虚拟表 VT8 中；

（9）DISTINCT：去除重复数据，产生虚拟表 VT9；

（10）ORDER BY：将虚拟表 VT9 中的记录按照 `<order_by_list> `进行排序操作操作，产生虚拟表VT10；

（11）LIMIT：取出指定行的记录，产生虚拟表 VT11，并返回给客户端；

## 7.2 演示

### 7.2.1 select 列表

SELECT语句是用于查看计算结果、或者查看从数据表中筛选出的数据的。

SELECT语句的基本语法：

```java
SELECT 常量;
SELECT 表达式;
SELECT 函数;
SELECT * 
SELECT 字段列表
SELECT DISTICT 字段列表
```

mysql可以在查询结果中使用distinct关键字去重。

### 7.2.2 from子句

```sql
#1、from子句
SELECT * 
FROM t_employee; #表示从某个表中筛选数据
```

### 7.2.3 on子句

```sql
#2、on子句
/*
（1）on必须配合join使用
（2）on后面只写关联条件
所谓关联条件是两个表的关联字段的关系
（3）有n张表关联，就有n-1个关联条件
两张表关联，就有1个关联条件
三张表关联，就有2个关联条件
*/
SELECT *
FROM t_employee INNER JOIN t_department
ON t_employee.did = t_department.did;  #1个关联条件

#查询员工的编号，姓名，职位编号，职位名称，部门编号，部门名称
#需要t_employee员工表，t_department部门表，t_job职位表
SELECT eid,ename,t_job.job_id,t_job.job_name, `t_department`.`did`,`t_department`.`dname`
FROM t_employee INNER JOIN t_department INNER JOIN t_job
ON t_employee.did = t_department.did AND t_employee.job_id = t_job.job_id;

```

### 7.2.4 where子句

```sql
#3、where子句，在查询结果中筛选
#查询女员工的信息，以及女员工的部门信息
SELECT *
FROM t_employee INNER JOIN t_department
ON t_employee.did = t_department.did
WHERE gender = '女';
```

### 7.2.5 group by子句

```sql
#4、group by分组
#查询所有员工的平均薪资
SELECT AVG(salary) FROM t_employee;

#查询每一个部门的平均薪资
SELECT did,ROUND(AVG(salary),2 )
FROM t_employee
GROUP BY did;

#查询每一个部门的平均薪资，显示部门编号，部门的名称，该部门的平均薪资
SELECT t_department.did,dname,ROUND(AVG(salary),2 )
FROM t_department LEFT JOIN t_employee
ON t_department.did = t_employee.did
GROUP BY t_department.did;

#查询每一个部门的平均薪资，显示部门编号，部门的名称，该部门的平均薪资
#要求，如果没有员工的部门，平均薪资不显示null，显示0
SELECT t_department.did,dname,IFNULL(ROUND(AVG(salary),2),0)
FROM t_department LEFT JOIN t_employee
ON t_department.did = t_employee.did
GROUP BY t_department.did;

#查询每一个部门的女员工的平均薪资，显示部门编号，部门的名称，该部门的平均薪资
#要求，如果没有员工的部门，平均薪资不显示null，显示0
SELECT t_department.did,dname,IFNULL(ROUND(AVG(salary),2),0)
FROM t_department LEFT JOIN t_employee
ON t_department.did = t_employee.did
WHERE gender = '女'
GROUP BY t_department.did;
```



问题1：合计，WITH ROLLUP，加在group by后面

```sql
#问题1：合计，WITH ROLLUP，加在group by后面
#按照部门统计人数
SELECT did, COUNT(*) FROM t_employee GROUP BY did;
#按照部门统计人数，并合计总数
SELECT did, COUNT(*) FROM t_employee GROUP BY did WITH ROLLUP;
SELECT IFNULL(did,'合计'), COUNT(*) FROM t_employee GROUP BY did WITH ROLLUP;
SELECT IFNULL(did,'合计') AS "部门编号" , COUNT(*)  AS "人数" FROM t_employee GROUP BY did WITH ROLLUP;

```

问题2：是否可以按照多个字段分组统计

```sql
#问题2：是否可以按照多个字段分组统计
#按照不同的部门，不同的职位，分别统计男和女的员工人数
SELECT did, job_id, gender, COUNT(*)
FROM t_employee 
GROUP BY did, job_id, gender;
```



问题3：分组统计时，select后面字段列表的问题

```sql
#问题4：分组统计时，select后面字段列表的问题
SELECT eid,ename, did, COUNT(*) FROM t_employee; 
#eid,ename, did此时和count(*)，不应该出现在select后面

SELECT eid,ename, did, COUNT(*) FROM t_employee GROUP BY did; 
#eid,ename此时和count(*)无关，不应该出现在select后面

SELECT  did, COUNT(*) FROM t_employee GROUP BY did;
#分组统计时，select后面只写和分组统计有关的字段，其他无关字段不要出现，否则会引起歧义
```



### 7.2.6 having子句

```sql
#5、having
/*
having子句也写条件
where的条件是针对原表中的字段的筛选。where后面不能出现分组函数，但是可以跟单行函数。
having子句是对统计结果（分组函数计算后）的筛选。having可以加分组函数。
on子句必须配合join使用，只用于编写关联条件。
*/
#查询每一个部门的女员工的平均薪资，显示部门编号，部门的名称，该部门的平均薪资
#要求，如果没有员工的部门，平均薪资不显示null，显示0
#最后只显示平均薪资高于12000的部门信息
SELECT t_department.did,dname,IFNULL(ROUND(AVG(salary),2),0)
FROM t_department LEFT JOIN t_employee
ON t_department.did = t_employee.did
WHERE gender = '女'
GROUP BY t_department.did
HAVING IFNULL(ROUND(AVG(salary),2),0) >12000;


#查询每一个部门的男和女员工的人数
SELECT did,gender,COUNT(*)
FROM t_employee
GROUP BY did,gender;

#查询每一个部门的男和女员工的人数，显示部门编号，部门的名称，性别，人数
SELECT t_department.did,dname,gender,COUNT(eid)
FROM t_employee RIGHT JOIN t_department
ON t_employee.did = t_department.did
GROUP BY t_department.did,gender;

#查询每一个部门薪资超过10000的男和女员工的人数，显示部门编号，部门的名称，性别，人数
#只显示人数低于3人
SELECT t_department.did,dname,gender,COUNT(eid)
FROM t_employee RIGHT JOIN t_department
ON t_employee.did = t_department.did
WHERE salary > 10000
GROUP BY t_department.did,gender
HAVING COUNT(eid) < 3;
```

### 7.2.7 order by子句

```sql
#6、排序 order by
/*
升序和降序，默认是升序
asc代表升序
desc 代表降序
*/
#查询员工信息，按照薪资从高到低
SELECT * FROM t_employee
ORDER BY salary DESC;

#查询每一个部门薪资超过10000的男和女员工的人数，显示部门编号，部门的名称，性别，人数
#只显示人数低于3人，按照人数升序排列
SELECT t_department.did,dname,gender,COUNT(eid)
FROM t_employee RIGHT JOIN t_department
ON t_employee.did = t_department.did
WHERE salary > 10000
GROUP BY t_department.did,gender
HAVING COUNT(eid) < 3
ORDER BY COUNT(eid);


#查询员工的薪资，按照薪资从低到高，薪资相同按照员工编号从高到低
SELECT *
FROM t_employee
ORDER BY salary ASC , eid DESC;
```

### 7.2.8 limit子句

```sql
#演示limit子句
/*
limit子句是用于分页显示结果。
limit m,n
n：表示最多该页显示几行
m：表示从第几行开始取记录，第一个行的索引是0
m = (page-1)*n  page表示第几页

每页最多显示5条，n=5
第1页，page=1，m = (1-1)*5 = 0;  limit 0,5
第2页，page=2，m = (2-1)*5 = 5;  limit 5,5
第3页，page=3，m = (3-1)*5 = 10;  limit 10,5
*/
#查询员工表的数据，分页显示，每页显示5条记录
#第1页
SELECT * FROM t_employee LIMIT 0,5;
#第2页
SELECT * FROM t_employee LIMIT 5,5;
#第3页
SELECT * FROM t_employee LIMIT 10,5;
#第4页
SELECT * FROM t_employee LIMIT 15,5;
#第5页
SELECT * FROM t_employee LIMIT 20,5;
#第6页
SELECT * FROM t_employee LIMIT 25,5;


#查询所有的男员工信息，分页显示，每页显示3条，第2页
#limit m,n  n=3,page=2,m=(page-1)*n=3
SELECT *
FROM t_employee
WHERE gender ='男'
LIMIT 3,3

#查询每一个编号为偶数的部门，显示部门编号，名称，员工数量，
#只显示员工数量>=2的结果，按照员工数量升序排列，
#每页显示2条，显示第1页
SELECT t_department.did,dname,COUNT(eid)
FROM t_employee RIGHT JOIN t_department
ON t_employee.did = t_department.did
WHERE t_department.did%2=0
GROUP BY t_department.did
HAVING COUNT(eid)>=2
ORDER BY COUNT(eid)
LIMIT 0,2;
```

## 7.3 别名引用问题

- 如果在select语句中，给在from后面的表名取了别名了，那么在整个select语句中， 要用表名的地方都要用别名。
- 如果在select语句中，给在select后面的字段或表达式等取别名，那么where之后的子句可以使用该别名，where以及之前的子句不可以使用该别名。

```sql
#错误
select  t_employee.eid,ename #错误，表有别名了，就只能用别名
from t_employee as emp;#as可以省略

#正确
select  emp.eid,ename 
from t_employee as emp;

#错误
select eid 员工编号,ename 员工姓名, t_employee.did 部门编号
from t_employee inner join t_department
on 部门编号 = t_department.did;

#正确
select eid 员工编号,ename 员工姓名, t_employee.did 部门编号
from t_employee inner join t_department
on t_employee.did = t_department.did;

#错误
select eid 员工编号,ename 员工姓名, t_employee.did 部门编号
from t_employee inner join t_department
on t_employee.did = t_department.did
where 员工姓名 is not null;

#正确
select eid 员工编号,ename 员工姓名, t_employee.did 部门编号
from t_employee inner join t_department
on t_employee.did = t_department.did
where ename is not null;

#正确
select eid 员工编号,ename 员工姓名, t_employee.did 部门编号
from t_employee inner join t_department
on t_employee.did = t_department.did
where ename is not null
group by 部门编号
having 部门编号 > 2
order by 部门编号;


#正确
select 部门表.did as 部门编号,dname 部门名称,count(*) 部门人数
from t_employee as 员工表 right join t_department as 部门表
#表定义别名，所有位置都必须用表的别名
on 员工表.did = 部门表.did
where salary > 8000 and dname is not null
#where之后，才可以使用字段列表的别名，也可以选择不用字段的别名
group by 部门编号 
having 部门人数<5
order by 部门编号
limit 0,2;
```
