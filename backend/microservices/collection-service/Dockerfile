FROM maven:3.9-eclipse-temurin-26 AS build
WORKDIR /workspace

COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw

COPY src/ src/
RUN ./mvnw -B package

FROM eclipse-temurin:21-jre
WORKDIR /app

COPY --from=build /workspace/target/collection-service-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
