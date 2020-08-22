# -*- coding: utf-8 -*-
from selenium import webdriver
driver = webdriver.Chrome('./chromedriver')
driver.get('https://www.asiae.co.kr/article/2020072115182367372')

title = driver.find_element_by_xpath('//*[@id="txt_area"]/div[2]/h4')
print(title.text)