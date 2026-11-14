FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace

COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw

COPY src/ src/
RUN ./mvnw -B package

FROM eclipse-temurin:21-jre
WORKDIR /app

# Le service s'exécute avec un compte sans privilèges, pas en root.
RUN groupadd --system app && useradd --system --gid app --no-create-home app

COPY --from=build /workspace/target/notification-service-0.0.1-SNAPSHOT.jar app.jar

USER app
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
