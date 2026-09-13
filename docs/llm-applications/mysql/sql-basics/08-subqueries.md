---
description: 尚硅谷大模型技术之MySQL · 第8章 子查询。
---

# 第8章 子查询

## 8.1 子查询的概念

嵌套在另一个SQL中的select语句，称为子查询。子查询可以嵌套在insert, delete, update, select, create语句中。所有子查询必须使用() 括起来。

子查询的结果有3种情况：

- 单个值：与单个值搭配使用的运算符有=, !=, >, <, >=, <=, like,between-and等
- 一列：与一列值搭配使用的运算符有in, not in, all, any, some等
- 一行多列或多行多列：通过取别名当表用

## 8.1 SELECT的SELECT中嵌套子查询

```sql
/*
子查询：嵌套在另一个SQL语句中的查询。
SELECT语句可以嵌套在另一个SELECT中，UPDATE，DELETE，INSERT，CREATE语句等。

(1)SELECT的SELECT中嵌套子查询
*/

#（1）在“t_employee”表中查询每个人薪资和公司平均薪资的差值，
#并显示员工薪资和公司平均薪资相差5000元以上的记录。
SELECT ename AS "姓名",
	salary AS "薪资",
 ROUND((SELECT AVG(salary) FROM t_employee),2) AS "全公司平均薪资",
 ROUND(salary-(SELECT AVG(salary) FROM t_employee),2) AS "差值"
FROM t_employee
WHERE ABS(ROUND(salary-(SELECT AVG(salary) FROM t_employee),2))>5000;

#（2）在“t_employee”表中查询每个部门平均薪资和公司平均薪资的差值。
SELECT did,AVG(salary),
AVG(salary)-(SELECT AVG(salary) FROM t_employee)
FROM t_employee
GROUP BY did;
```



## 8.2 SELECT的WHERE或HAVING中嵌套子查询

当子查询结果作为外层另一个SQL的过滤条件，通常把子查询嵌入到WHERE或HAVING中。根据子查询结果的情况，分为如下三种情况。

- 当子查询的结果是单列单个值，那么可以直接使用比较运算符，如“<”、“<=”、“>”、“>=”、“=”、“!=”等与子查询结果进行比较。
- 当子查询的结果是单列多个值，那么可以使用比较运算符IN或NOT IN进行比较。
- 当子查询的结果是单列多个值，还可以使用比较运算符, 如“<”、“<=”、“>”、“>=”、“=”、“!=”等搭配ANY、SOME、ALL等关键字与查询结果进行比较。

```sql
/*
子查询嵌套在where后面。
在where或having后面的子查询结果是：
（1）单个值，那么可以用=，>,<,>=,<=,!=这样的运算符和子查询的结果做比较
（2）多个值，那么需要用in,not in, >all,>any....形式做比较
 如“<”、“<=”、“>”、“>=”、“=”、“!=”等搭配ANY、SOME、ALL等关键字与查询结果进行比较

*/
#（1）在“t_employee”表中查询薪资最高的员工姓名（ename）和薪资（salary）。
#SELECT ename,MAX(salary) FROM t_employee;#错误
#取表中第一行员工的姓名和全公司最高的薪资值一起显示。

SELECT ename,salary
FROM t_employee
WHERE salary = (SELECT MAX(salary) FROM t_employee);

#（2）在“t_employee”表中查询比全公司平均薪资高的男员工姓名和薪资。
SELECT ename,salary
FROM t_employee
WHERE salary > (SELECT AVG(salary) FROM t_employee) AND gender = '男';

#（3）在“t_employee”表中查询和“白露”，“谢吉娜”同一部门的员工姓名和电话。
SELECT ename,tel,did
FROM t_employee
WHERE did IN(SELECT did FROM t_employee WHERE ename='白露' || ename='谢吉娜');

SELECT ename,tel,did
FROM t_employee
WHERE did =ANY(SELECT did FROM t_employee WHERE ename='白露' || ename='谢吉娜');


#（4）在“t_employee”表中查询薪资比“白露”，“李诗雨”，“黄冰茹”三个人的薪资都要高的员工姓名和薪资。
SELECT ename,salary
FROM t_employee
WHERE salary >ALL(SELECT salary FROM t_employee WHERE ename IN('白露','李诗雨','黄冰茹'));


#（5）查询“t_employee”和“t_department”表，按部门统计平均工资，
#显示部门平均工资比全公司的总平均工资高的部门编号、部门名称、部门平均薪资，
#并按照部门平均薪资升序排列。
SELECT t_department.did,dname,AVG(salary)
FROM t_employee RIGHT JOIN t_department
ON t_employee.did = t_department.did
GROUP BY t_department.did
HAVING AVG(salary) >(SELECT AVG(salary) FROM t_employee)
ORDER BY AVG(salary);
```

## 8.3 SELECT中的EXISTS型子查询

EXISTS型子查询也是存在外层SELECT的WHERE子句中，不过它和上面的WHERE型子查询的工作模式不相同，所以这里单独讨论它。

- 如果EXISTS关键字后面的参数是一个任意的子查询，系统将对子查询进行运算以判断它是否返回行，如果至少返回一行，那么EXISTS的结果为true，此时外层查询语句将进行查询；如果子查询没有返回任何行，那么EXISTS的结果为false，此时外层查询语句不进行查询。EXISTS和NOT EXISTS的结果只取决于是否返回行，而不取决于这些行的内容，所以这个子查询输入列表通常是无关紧要的。

- 如果EXISTS关键字后面的参数是一个关联子查询，即子查询的WHERE条件中包含与外层查询表的关联条件，那么此时将对外层查询表做循环，即在筛选外层查询表的每一条记录时，都看这条记录是否满足子查询的条件，如果满足就再用外层查询的其他WHERE条件对该记录进行筛选，否则就丢弃这行记录。


```sql
#exist型子查询
/*
（1）exists()中的子查询和外面的查询没有联合的情况下，
如果exists()中的子查询没有返回任何行，那么外面的子查询就不查了。
（2）exists()中的子查询与外面的查询有联合工作的情况下，
循环进行把外面查询表的每一行记录的值，代入()中子查询，如果可以查到结果，
就留下外面查询的这条记录，否则就舍去。
*/

#（1）查询“t_employee”表中是否存在部门编号为NULL的员工，
#如果存在，查询“t_department”表的部门编号、部门名称。
SELECT * FROM t_department 
WHERE EXISTS(SELECT * FROM t_employee  WHERE did IS NULL);

#（2）查询“t_department”表是否存在与“t_employee”表相同部门编号的记录，
#如果存在，查询这些部门的编号和名称。
SELECT * FROM t_department
WHERE EXISTS(SELECT * FROM t_employee WHERE t_employee.did = t_department.did);

#查询结果等价于下面的sql
SELECT DISTINCT t_department.*
FROM t_department INNER JOIN t_employee
ON t_department.did = t_employee.did;
```

## 8.4 SELECT的FROM中嵌套子查询

当子查询结果是多列的结果时，通常将子查询放到FROM后面，然后采用给子查询结果取别名的方式，把子查询结果当成一张“动态生成的临时表”使用。

```sql
#子查询嵌套在from后面
/*
当一个查询要基于另一个查询结果来筛选的时候，
另一个查询还是多行多列的结果，那么就可以把这个查询结果当成一张临时表，
放在from后面进行再次筛选。

*/

#（1）在“t_employee”表中，查询每个部门的平均薪资，
#然后与“t_department”表联合查询
#所有部门的部门编号、部门名称、部门平均薪资。

SELECT did,AVG(salary) FROM t_employee GROUP BY did;

+------+-------------+
| did  | AVG(salary) |
+------+-------------+
|    1 |  11479.3125 |
|    2 |       13978 |
|    3 |    37858.25 |
|    4 |       12332 |
|    5 |       11725 |
+------+-------------+
5 ROWS IN SET (0.00 sec)

#用上面的查询结果，当成一张临时表，与t_department部门表做联合查询
#要给这样的子查询取别名的方式来当临时表用，不取别名是不可以的。
#而且此时的别名不能加""
#字段的别名可以加""，表的别名不能加""

SELECT t_department.did ,dname,AVG(salary)
FROM t_department LEFT JOIN (SELECT did,AVG(salary) FROM t_employee GROUP BY did) temp
ON t_department.did = temp.did;
#错误，from后面的t_department和temp表都没有salary字段，
#SELECT t_department.did ,dname,AVG(salary)出现AVG(salary)是错误的

SELECT t_department.did ,dname,pingjun
FROM t_department LEFT JOIN (SELECT did,AVG(salary) AS pingjun FROM t_employee GROUP BY did) temp
ON t_department.did = temp.did;
```

## 8.5 UPDATE中嵌套子查询

```sql
#子查询也可以嵌套在update语句中
#（1）修改“t_employee”表中部门编号（did）和
#“测试部”部门编号（did）相同的员工薪资为原来薪资的1.5倍。
UPDATE t_employee
SET salary = salary * 1.5
WHERE did = (SELECT did FROM t_department WHERE dname = '测试部');

#（2）修改“t_employee”表中did为NULL的员工信息，
#将他们的did值修改为“测试部”的部门编号。
#子查询select did from t_department where dname = '测试部'
#这种子查询必须是单个值，否则无法赋值

UPDATE t_employee 
SET did = (SELECT did FROM t_department WHERE dname = '测试部')
WHERE did IS NULL;

#（3）修改“t_employee”表中“李冰冰”的薪资值等于“孙红梅”的薪资值。
#这里使用子查询先在“t_employee”表中查询出“孙红梅”的薪资。
#select salary from t_employee where ename = '孙红梅';

UPDATE t_employee
SET salary = (SELECT salary FROM t_employee WHERE ename = '孙红梅')
WHERE ename = '李冰冰';
#You can't specify target table 't_employee' for update in FROM clause'

UPDATE t_employee
SET salary = (SELECT salary FROM(SELECT salary FROM t_employee WHERE ename = '孙红梅')temp)
WHERE ename = '李冰冰';
#当update的表和子查询的表是同一个表时，需要将子查询的结果用临时表的方式表示
#即再套一层子查询，使得update和最外层的子查询不是同一张表

#（4）修改“t_employee”表“李冰冰”的薪资与她所在部门的平均薪资一样。
#子查询，查询李冰冰的部门编号 
#select did from t_employee where ename = '李冰冰';

#子查询第二层，查询李冰冰所在部门的平均薪资
#select avg(salary) from t_employee where did = (select did from t_employee where ename = '李冰冰');

#子查询第三层，把第二层的子查询结果当成临时表再查一下结果
#目的使得和外层的update不是同一张表
SELECT pingjun FROM (SELECT AVG(salary) pingjun FROM t_employee WHERE did = (SELECT did FROM t_employee WHERE ename = '李冰冰') temp)

#update更新
UPDATE t_employee
SET salary = 
(SELECT pingjun FROM 
	(SELECT AVG(salary) pingjun FROM t_employee WHERE did = 
		(SELECT did FROM t_employee WHERE ename = '李冰冰') ) temp)
WHERE ename = '李冰冰';
```

## 8.6 DELETE中嵌套子查询

```sql
#delete语句中也可以嵌套子查询
#（1）从“t_employee”表中删除“测试部”的员工记录。
DELETE FROM t_employee 
WHERE did = (SELECT did FROM t_department WHERE dname = '测试部');


#（2）从“t_employee”表中删除和“李冰冰”同一个部门的员工记录。
#子查询 “李冰冰”的部门编号
#select did from t_employee where ename = '李冰冰';

DELETE FROM t_employee WHERE did = (SELECT did FROM t_employee WHERE ename = '李冰冰');
#You can't specify target table 't_employee' for update in FROM clause'
#删除和子查询是同一张表

DELETE FROM t_employee WHERE did = (SELECT did FROM (SELECT did FROM t_employee WHERE ename = '李冰冰')temp);
```

## 8.7 使用子查询复制表结构和数据

```sql
#演示通过子查询复制表，
#（1）复制表结构
#（2）复制一条或多条记录
#（3）同时复制表结构和记录
#仅仅是复制表结构，可以用create语句
CREATE TABLE department LIKE t_department;

#使用INSERT语句+子查询，复制数据，此时INSERT不用写values
INSERT INTO department (SELECT * FROM t_department WHERE did<=3);

#同时复制表结构+数据
CREATE TABLE d_department AS (SELECT * FROM t_department);
#如果select后面是部分字段，复制的新表就只有这一部分字段
```
