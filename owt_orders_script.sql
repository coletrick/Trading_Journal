
DROP TABLE CompletedOrderTrades;
DROP TABLE CompletedTransTrades;
DROP TABLE CompletedExpTransTrades;


CREATE TABLE CompletedOrderTrades
(
ID INT NOT NULL AUTO_INCREMENT,
TradeId INT,
OrderId VARCHAR(25),
OrderDate DATE,
PRIMARY KEY (ID)
);

CREATE TABLE CompletedTransTrades
(
ID INT NOT NULL AUTO_INCREMENT,
TradeId INT,
OrderIdShort VARCHAR(25),
TransId VARCHAR(25),
TransDate DATE,
PRIMARY KEY (ID)
);

CREATE TABLE CompletedExpTransTrades
(
ID INT NOT NULL AUTO_INCREMENT,
TradeId INT,
ExpTransId VARCHAR(25),
ExpTransDate DATE,
ExpTransCusip VARCHAR(25),
ExpTransDescription VARCHAR(50),
PRIMARY KEY (ID)
);

 
 SET FOREIGN_KEY_CHECKS=1;