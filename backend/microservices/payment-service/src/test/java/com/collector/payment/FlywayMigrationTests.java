package com.collector.payment;

import static org.assertj.core.api.Assertions.assertThat;

import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Les migrations Flyway créent un schéma que Hibernate accepte (ddl-auto=validate) :
 * si une entité change sans migration, ce test échoue.
 */
@SpringBootTest(
        properties = {"spring.flyway.enabled=true", "spring.jpa.hibernate.ddl-auto=validate"})
class FlywayMigrationTests {

    @Autowired
    private DataSource dataSource;

    @Test
    void appliqueToutesLesMigrationsSansErreur() {
        var flyway = Flyway.configure().dataSource(dataSource).load();

        assertThat(flyway.info().pending()).isEmpty();
        assertThat(flyway.info().applied()).isNotEmpty();
    }
}
